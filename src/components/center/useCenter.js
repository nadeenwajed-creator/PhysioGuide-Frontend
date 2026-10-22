import { useOutletContext } from 'react-router-dom';
// CenterLayout owns the service snapshot; pages never import fixtures.
export default function useCenter() {
  return useOutletContext();
}
