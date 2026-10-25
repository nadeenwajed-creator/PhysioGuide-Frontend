import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Link, useLocation, useOutlet } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

import { useLanguage } from "../../context/LanguageContext.jsx";

import logo from "../../assets/logo/physioguide-icon.svg";
import "./AuthShell.css";

// ==================================================
// 1. إعدادات الشاشة والحركة
// ==================================================

const DESKTOP_QUERY = "(min-width: 960px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// ننشئ MediaQueryList مرة واحدة بدل إنشائها في كل فحص.
const desktopMedia = window.matchMedia(DESKTOP_QUERY);
const motionMedia = window.matchMedia(REDUCED_MOTION_QUERY);

// يخبر React عندما يتغير حجم الشاشة أو إعداد الحركة.
function subscribeDisplay(callback) {
  desktopMedia.addEventListener("change", callback);
  motionMedia.addEventListener("change", callback);

  // تنظيف الاشتراكات عند إلغاء الاشتراك.
  return () => {
    desktopMedia.removeEventListener("change", callback);
    motionMedia.removeEventListener("change", callback);
  };
}

// Snapshot functions ثابتة خارج المكون.
function getDesktopSnapshot() {
  return desktopMedia.matches;
}

function getReducedMotionSnapshot() {
  return motionMedia.matches;
}

// ==================================================
// 2. أدوات صغيرة لاستخراج معلومات المسار
// ==================================================

function getPageMode(pathname) {
  return pathname.endsWith("/signup") ? "signup" : "login";
}

function getUserRole(pathname) {
  return pathname.startsWith("/center/") ? "center" : "patient";
}

// ==================================================
// 3. المكون الرئيسي
// ==================================================

function AuthShell() {
  // المسار الحالي والمكون الذي يحدده React Router.
  const { pathname } = useLocation();
  const outlet = useOutlet();

  // الاشتراك في تغييرات Media Queries.
  const desktop = useSyncExternalStore(subscribeDisplay, getDesktopSnapshot);

  const reducedMotion = useSyncExternalStore(
    subscribeDisplay,
    getReducedMotionSnapshot
  );

  // معلومات اللغة واتجاه الصفحة.
  const { t, dir } = useLanguage();

  // تحديد نوع صفحة المصادقة الحالية.
  const mode = getPageMode(pathname);
  const role = getUserRole(pathname);

  // الحركات المرحلية مخصصة للشاشات الكبيرة عند السماح بالحركة.
  const staged = desktop && !reducedMotion;

  // ==================================================
  // 4. الحالة والمراجع
  // ==================================================

  // الصفحة التي نعرضها حاليًا أثناء الانتقال بين المسارات.
  const [view, setView] = useState(() => ({
    pathname,
    outlet,
  }));

  // مرجع الغلاف الخارجي لقياس ارتفاعه وتحريكه.
  const shellRef = useRef(null);

  // مرجع عنصر الفورم الذي نحرّكه.
  const formRef = useRef(null);

  // يمنع تشغيل حركة الدخول في أول عرض.
  const hasEnteredRef = useRef(false);

  // آخر ارتفاع معروف للغلاف.
  const previousHeightRef = useRef(null);

  // كائن الحركة الحالية للارتفاع، حتى نتمكن من إلغائها.
  const heightAnimationRef = useRef(null);

  // عند تعطيل الحركة المرحلية، نستخدم المسار الحالي مباشرة.
  // عند تفعيلها، ننتظر انتهاء خروج الفورم القديم.
  if (!staged && view.pathname !== pathname) {
    setView({ pathname, outlet });
  }

  const displayedView = staged ? view : { pathname, outlet };

  // نحدد نوع الفورم الذي نعرضه فعلًا، لا نوع المسار الجديد فقط.
  const formMode = getPageMode(displayedView.pathname);

  // ==================================================
  // 5. إخراج الفورم القديم
  // ==================================================

  useLayoutEffect(() => {
    // لا حاجة لحركة خروج إذا كانت الحركة المرحلية معطلة،
    // أو إذا كان الفورم المعروض هو المطلوب بالفعل.
    if (!staged || view.pathname === pathname) {
      return undefined;
    }

    const form = formRef.current;

    if (!form) {
      setView({ pathname, outlet });
      return undefined;
    }

    // نعكس إشارة الحركة عندما تكون الصفحة RTL.
    const direction = dir === "rtl" ? -1 : 1;

    const exitAnimation = form.animate(
      [
        {
          opacity: getComputedStyle(form).opacity,
          transform: "translateX(0)",
        },
        {
          opacity: 0,
          transform: `translateX(${
            direction * (mode === "signup" ? -16 : 16)
          }px)`,
        },
      ],
      {
        duration: 160,
        fill: "forwards",
        easing: "ease-out",
      }
    );

    // بعد اختفاء الفورم القديم، نبدله بالفورم الجديد.
    exitAnimation.onfinish = () => {
      setView({ pathname, outlet });
    };

    // إذا تغير المسار مجددًا قبل انتهاء الحركة، نلغيها.
    return () => exitAnimation.cancel();
  }, [pathname, outlet, staged, dir, mode, view.pathname]);

  // ==================================================
  // 6. إدخال الفورم الجديد
  // ==================================================

  useLayoutEffect(() => {
    // عند إيقاف الحركات، نعيد ضبط حالة الدخول.
    if (!staged) {
      hasEnteredRef.current = false;
      return undefined;
    }

    // العرض الأول لا يحتاج حركة انتقال بين صفحتين.
    if (!hasEnteredRef.current) {
      hasEnteredRef.current = true;
      return undefined;
    }

    const form = formRef.current;

    if (!form) return undefined;

    // تحديد جهة دخول الفورم حسب اللغة ونوع الصفحة.
    const direction = dir === "rtl" ? -1 : 1;
    const offset = formMode === "signup" ? 16 : -16;
    const startX = direction * offset;

    // منع التفاعل مع الفورم أثناء الحركة.
    form.inert = true;

    const entryAnimation = form.animate(
      [
        {
          opacity: 0,
          transform: `translateX(${startX}px)`,
        },
        {
          opacity: 1,
          transform: "translateX(0)",
        },
      ],
      {
        duration: 280,
        delay: 400,
        fill: "backwards",
        easing: "ease-out",
      }
    );

    // بعد ظهور الفورم، نعيد التفاعل وننقل التركيز إلى العنوان.
    entryAnimation.onfinish = () => {
      form.inert = false;
      form.querySelector("h1")?.focus({ preventScroll: true });
    };

    // إلغاء الحركة وإعادة التفاعل إذا أُعيد تشغيل الـ Effect.
    return () => {
      entryAnimation.cancel();
      form.inert = false;
    };
  }, [displayedView.pathname, staged, dir, formMode]);

  // ==================================================
  // 7. تحريك ارتفاع الغلاف عند تبديل الفورم
  // ==================================================

  useLayoutEffect(() => {
    const shell = shellRef.current;

    if (!shell) return;

    // نحصل على الارتفاع الذي كانت عليه الصفحة قبل التغيير.
    const previousHeight = heightAnimationRef.current
      ? shell.getBoundingClientRect().height
      : previousHeightRef.current;

    // نلغي أي حركة ارتفاع سابقة قبل بدء حركة جديدة.
    heightAnimationRef.current?.cancel();
    heightAnimationRef.current = null;

    // الارتفاع الطبيعي بعد عرض الفورم الجديد.
    const nextHeight = shell.getBoundingClientRect().height;
    previousHeightRef.current = nextHeight;

    // لا نحتاج حركة إذا لم يوجد ارتفاع سابق أو لم يتغير الحجم.
    if (
      previousHeight === null ||
      Math.abs(previousHeight - nextHeight) < 1 ||
      motionMedia.matches
    ) {
      return;
    }

    // الحركة أقصر على الشاشات الصغيرة.
    const compact = window.matchMedia("(max-width: 959px)").matches;

    const heightAnimation = shell.animate(
      [{ blockSize: `${previousHeight}px` }, { blockSize: `${nextHeight}px` }],
      {
        duration: compact ? 360 : 520,
        easing: "cubic-bezier(.22, .7, .2, 1)",
      }
    );

    heightAnimationRef.current = heightAnimation;

    heightAnimation.onfinish = () => {
      // لا نحدّث المرجع إذا كانت هناك حركة أحدث.
      if (heightAnimationRef.current === heightAnimation) {
        heightAnimationRef.current = null;
        previousHeightRef.current = shell.getBoundingClientRect().height;
      }
    };
  }, [displayedView.pathname]);

  // ==================================================
  // 8. مراقبة الحجم وتنظيف الموارد
  // ==================================================

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell) return undefined;

    // يراقب تغير حجم الغلاف بسبب المحتوى أو CSS.
    const resizeObserver = new ResizeObserver(() => {
      if (!heightAnimationRef.current) {
        previousHeightRef.current = shell.getBoundingClientRect().height;
      }
    });

    // عند تغيير الشاشة أو تفضيل الحركة،
    // نوقف حركة الارتفاع ونحفظ الحجم الطبيعي الحالي.
    function restoreNaturalSize() {
      heightAnimationRef.current?.cancel();
      heightAnimationRef.current = null;

      previousHeightRef.current = shell.getBoundingClientRect().height;
    }

    resizeObserver.observe(shell);
    window.addEventListener("resize", restoreNaturalSize);
    motionMedia.addEventListener("change", restoreNaturalSize);

    // تنظيف كل المستمعات والمراقبين والحركة عند إزالة المكون.
    return () => {
      resizeObserver.disconnect();
      heightAnimationRef.current?.cancel();

      window.removeEventListener("resize", restoreNaturalSize);
      motionMedia.removeEventListener("change", restoreNaturalSize);
    };
  }, []);

  // ==================================================
  // 9. واجهة المستخدم
  // ==================================================

  return (
    <section
      ref={shellRef}
      className={`auth-shell auth-shell--${mode}`}
      aria-label={t("auth.pageLabel")}
    >
      {/* رابط الرجوع إلى اختيار نوع الحساب. */}
      <Link
        className="auth-shell__back"
        to="/choose-role"
        aria-label={t("auth.chooseRole")}
      >
        <FontAwesomeIcon
          icon={faArrowLeft}
          className="public-directional"
          aria-hidden="true"
        />

        <span className="auth-shell__back-label">{t("auth.chooseRole")}</span>
      </Link>

      {/* لوحة الهوية: تتغير نصوصها حسب الدور واللغة. */}
      <aside className="auth-shell__panel">
        <div className="auth-shell__story">
          <Link
            to="/"
            className="auth-shell__brand"
            aria-label={t("public.home")}
          >
            <img
              className="auth-shell__logo"
              src={logo}
              alt=""
              width="40"
              height="40"
            />

            <span>PhysioGuide</span>
          </Link>

          <p className="auth-shell__eyebrow">{t(`auth.${role}.eyebrow`)}</p>

          <h2>
            {t(`auth.${role}.headline`)} <span>{t(`auth.${role}.accent`)}</span>
          </h2>

          <p className="auth-shell__description">
            {t(`auth.${role}.description`)}
          </p>
        </div>
      </aside>

      {/* منطقة الفورم الفعلي، الذي يحدده React Router. */}
      <div
        className={`auth-shell__form-area auth-shell__form-area--${formMode}`}
      >
        <div
          key={displayedView.pathname}
          ref={formRef}
          className="auth-shell__form-entry"
          inert={staged && view.pathname !== pathname}
        >
          {displayedView.outlet}
        </div>
      </div>
    </section>
  );
}

export default AuthShell;
