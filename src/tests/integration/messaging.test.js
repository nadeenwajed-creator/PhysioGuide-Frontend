import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockCenterAdapter } from '../../services/center/mockCenterAdapter.js';
import { authorizeCenterOperation } from '../../services/center/access.js';

const therapist = {
  id: 'staff:t1',
  role: 'physiotherapist',
  centerId: 'clinic',
  therapistId: 't1',
};
const patient = {
  id: 'patient-account',
  role: 'patient',
  centerId: 'clinic',
  patientId: 'p1',
};
function setup() {
  let saved = {
    center: { id: 'clinic', name: { en: 'Clinic' } },
    patients: [
      { id: 'p1', name: { en: 'Patient' }, notes: ['private'] },
      { id: 'p2', name: { en: 'Other' } },
    ],
    therapists: [
      { id: 't1', name: { en: 'Therapist' }, email: 'private@example.com' },
      { id: 't2' },
    ],
    services: [],
    notifications: [],
    conversations: [
      {
        id: 'c1',
        patientId: 'p1',
        therapistId: 't1',
        unreadCount: 3,
        messages: [
          {
            id: 'legacy',
            direction: 'incoming',
            text: 'Legacy question',
            sentAt: '2026-01-01T10:00:00Z',
          },
        ],
      },
      {
        id: 'c2',
        patientId: 'p2',
        therapistId: 't2',
        unreadCount: 0,
        messages: [],
      },
    ],
  };
  let failure = false;
  const store = {
    read: () => structuredClone(saved),
    write: (value) => {
      if (failure)
        throw Object.assign(new Error('storageUnavailable'), {
          code: 'storageUnavailable',
        });
      saved = structuredClone(value);
    },
  };
  const create = () =>
    createMockCenterAdapter(store.read(), {
      store,
      now: () => new Date('2026-01-02T12:00:00Z'),
    });
  return {
    adapter: create(),
    create,
    read: store.read,
    fail: () => {
      failure = true;
    },
  };
}

test('legacy migration counts actual messages and keeps notification reads independent', async () => {
  const { adapter, create } = setup();
  let workspace = await adapter.getMessagingWorkspace(therapist);
  assert.equal(workspace.conversations[0].unreadCount, 1);
  assert.equal(
    workspace.notifications.filter((item) => !item.isRead).length,
    1
  );
  await adapter.markConversationRead(therapist, 'c1');
  workspace = await create().getMessagingWorkspace(therapist);
  assert.equal(workspace.conversations[0].unreadCount, 0);
  assert.equal(
    workspace.notifications.filter((item) => !item.isRead).length,
    1
  );
  await adapter.markNotificationsRead(therapist);
  assert.equal(
    (await create().getMessagingWorkspace(therapist)).notifications.filter(
      (item) => !item.isRead
    ).length,
    0
  );
});

test('patient and therapist exchange the same IDs, with recipient-specific unread and read status', async () => {
  const { adapter, create } = setup();
  await adapter.markConversationRead(therapist, 'c1');
  const sent = await adapter.sendMessage(patient, 'c1', {
    text: 'Question',
    clientId: 'unique',
  });
  const again = await adapter.sendMessage(patient, 'c1', {
    text: 'Question',
    clientId: 'unique',
  });
  assert.equal(again.id, sent.id);
  const own = await adapter.getMessagingWorkspace(patient);
  assert.equal(own.conversations[0].messages.at(-1).direction, 'outgoing');
  let received = await create().getMessagingWorkspace(therapist);
  assert.equal(received.conversations[0].messages.at(-1).id, sent.id);
  assert.equal(received.conversations[0].unreadCount, 1);
  assert.equal(
    received.notifications.filter((item) => item.id.endsWith(sent.id)).length,
    1
  );
  await adapter.markNotificationsRead(therapist, `message:c1:${sent.id}`);
  assert.equal(
    (await adapter.getMessagingWorkspace(therapist)).conversations[0]
      .unreadCount,
    1
  );
  await adapter.markConversationRead(therapist, 'c1', [sent.id]);
  assert.equal(
    (await adapter.getMessagingWorkspace(patient)).conversations[0].messages.at(
      -1
    ).status,
    'read'
  );
  const reply = await adapter.sendMessage(therapist, 'c1', { text: 'Reply' });
  const patientView = await create().getMessagingWorkspace(patient);
  assert.equal(patientView.conversations[0].messages.at(-1).id, reply.id);
  assert.equal(patientView.conversations[0].unreadCount, 1);
  await adapter.markConversationRead(patient, 'c1');
  assert.equal(
    (await adapter.getMessagingWorkspace(patient)).notifications.filter(
      (item) => !item.isRead
    ).length,
    1
  );
  received = await adapter.getMessagingWorkspace(therapist);
  assert.equal(received.conversations[0].messages.at(-1).status, 'read');
});

test('ownership prevents other conversations and the restricted projection excludes private records', async () => {
  const { adapter } = setup();
  for (const actor of [patient, therapist]) {
    await assert.rejects(
      adapter.sendMessage(actor, 'c2', { text: 'No access' }),
      { code: 'notFound' }
    );
    await assert.rejects(adapter.markConversationRead(actor, 'c2'), {
      code: 'notFound',
    });
    await assert.rejects(
      adapter.getMessagingWorkspace({ ...actor, centerId: 'other' }),
      { code: 'forbidden' }
    );
  }
  await assert.rejects(
    adapter.getMessagingWorkspace({ role: 'center', centerId: 'clinic' }),
    { code: 'forbidden' }
  );
  await assert.rejects(
    adapter.getMessagingWorkspace({ ...patient, patientId: 'missing' }),
    { code: 'forbidden' }
  );
  assert.throws(() => authorizeCenterOperation(patient, 'saveTherapist'), {
    code: 'forbidden',
  });
  const own = await adapter.getMessagingWorkspace(patient);
  assert.deepEqual(
    own.conversations.map((item) => item.id),
    ['c1']
  );
  assert.equal(own.patients[0].notes, undefined);
  assert.equal(own.therapists[0].email, undefined);
  assert.equal(own.therapists.length, 1);
});

test('attachments persist after adapter recreation and invalid or empty payloads never write', async () => {
  const { adapter, create, read } = setup();
  const before = read();
  await assert.rejects(adapter.sendMessage(patient, 'c1', { text: '  ' }), {
    code: 'required',
  });
  const invalid = new File(['bad'], 'bad.exe');
  await assert.rejects(
    adapter.sendMessage(patient, 'c1', {
      attachments: [{ name: invalid.name, sourceFile: invalid }],
    }),
    { code: 'attachment' }
  );
  assert.deepEqual(read(), before);
  const file = new File(['pdf test bytes'], 'notes.pdf', {
    type: 'application/pdf',
  });
  const message = await adapter.sendMessage(patient, 'c1', {
    attachments: [{ name: file.name, sourceFile: file }],
  });
  const stored = (
    await create().getMessagingWorkspace(therapist)
  ).conversations[0].messages.find((item) => item.id === message.id);
  assert.equal(stored.attachments[0].name, file.name);
  assert.equal(
    await (await fetch(stored.attachments[0].url)).text(),
    'pdf test bytes'
  );
  assert.equal('sourceFile' in stored.attachments[0], false);
});

test('separate adapters preserve sequential writes and rollback failed message storage', async () => {
  const { adapter, create, read, fail } = setup();
  const other = create();
  await adapter.sendMessage(patient, 'c1', { text: 'First' });
  await other.sendMessage(therapist, 'c1', { text: 'Second' });
  adapter.reload();
  assert.deepEqual(
    (await adapter.getMessagingWorkspace(patient)).conversations[0].messages
      .slice(-2)
      .map((item) => item.text),
    ['First', 'Second']
  );
  const before = read();
  fail();
  await assert.rejects(
    adapter.sendMessage(patient, 'c1', { text: 'Not saved' }),
    { code: 'storageUnavailable' }
  );
  assert.deepEqual(read(), before);
  assert.equal(
    (await adapter.getMessagingWorkspace(patient)).conversations[0].messages
      .length,
    3
  );
});
