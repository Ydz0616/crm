import DashboardModule from '@/modules/DashboardModule';
export default function Dashboard() {
  return (
    <div
      style={{
        margin: '40px auto 30px',
        padding: '0 40px',
        maxWidth: 1200,
        width: '100%',
      }}
    >
      <DashboardModule />
    </div>
  );
}
