import { useLocation, useNavigate, useNavigation, useSearchParams, type NavigateFunction } from "react-router";

// Data-router query navigations are asynchronous; sibling controls must compose
// against the last committed URL rather than overwrite each other's snapshots.
let filterNavigation = Promise.resolve();
function changeFilter(navigate: NavigateFunction, pathname: string, name: string, value: string) {
  filterNavigation = filterNavigation.catch(() => {}).then(async () => {
    if (window.location.pathname !== pathname) return;
    const next = new URLSearchParams(window.location.search);
    next.set(name, value);
    await navigate({ pathname, search: `?${next.toString()}` });
  });
}

export function ListFilter({ name, label, options, defaultValue }: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const raw = params.get(name);
  const value = options.some((option) => option.value === raw) ? raw! : defaultValue;
  return (
    <label className="customer-status-filter">
      {label}
      <select name={name} className="status-filter" value={value} disabled={navigation.state !== "idle"} onChange={(event) => {
        changeFilter(navigate, pathname, name, event.target.value);
      }}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
