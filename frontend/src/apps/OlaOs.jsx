import { lazy, Suspense, useEffect, useState } from 'react';

import { useSelector } from 'react-redux';
import { selectAuth } from '@/redux/auth/selectors';
import { AppContextProvider } from '@/context/appContext';
import PageLoader from '@/components/PageLoader';
import AuthRouter from '@/router/AuthRouter';
import Localization from '@/locale/Localization';
import { notification } from 'antd';

const ErpApp = lazy(() => import('./ErpApp'));

const DefaultApp = () => (
  <Localization>
    <AppContextProvider>
      <Suspense fallback={<PageLoader />}>
        <ErpApp />
      </Suspense>
    </AppContextProvider>
  </Localization>
);

export default function OlaOs() {
  const { isLoggedIn } = useSelector(selectAuth);

  // DEV ONLY: bypass login wall for UI development
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  console.log('🚀 Welcome to Ola ERP CRM!');

  if (!isLoggedIn && !bypassAuth)
    return (
      <Localization>
        <AuthRouter />
      </Localization>
    );
  else {
    return <DefaultApp />;
  }
}
