import { useLocation } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui.jsx';

export default function NotImplemented() {
  const { pathname } = useLocation();
  return (
    <>
      <PageHeader title="Not built yet" />
      <Card>
        <p className="text-sm text-slate-600">
          <code className="rounded bg-slate-100 px-1">{pathname}</code> is part of a later milestone in the project spec
          (see <code className="rounded bg-slate-100 px-1">docs/SPEC.md</code>, section 21) and has not been implemented
          in this build.
        </p>
      </Card>
    </>
  );
}
