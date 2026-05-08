import { Result } from 'antd';
import { useSelector } from 'react-redux';

import { selectCurrentAdmin } from '@/redux/auth/selectors';
import isInternalUser from '@/utils/isInternalUser';
import useLanguage from '@/locale/useLanguage';
import DevDashboardModule from '@/modules/DevDashboardModule';

export default function DevDashboard() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const translate = useLanguage();

  if (!isInternalUser(currentAdmin)) {
    return (
      <Result
        status="403"
        title={translate('access_denied')}
        subTitle={translate('internal_only')}
      />
    );
  }

  return (
    <div
      style={{
        margin: '40px auto 30px',
        padding: '0 40px',
        maxWidth: 1200,
        width: '100%',
      }}
    >
      <DevDashboardModule />
    </div>
  );
}
