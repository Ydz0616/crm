import { lazy, Suspense } from 'react';

import { useSelector } from 'react-redux';
import { selectAuth } from '@/redux/auth/selectors';
import { AppContextProvider } from '@/context/appContext';
import PageLoader from '@/components/PageLoader';
import AuthRouter from '@/router/AuthRouter';
import Onboarding from '@/pages/Onboarding';
import Localization from '@/locale/Localization';

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
  const { isLoggedIn, current } = useSelector(selectAuth);

  // DEV ONLY: bypass login wall for UI development
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  console.log('🚀 Welcome to Ola ERP CRM!');

  // 三层路由拦截:
  // 1. 未登录 → AuthRouter（Login / Register）
  // 2. 已登录 + 未上车 → Onboarding wizard
  // 3. 已登录 + 已上车 → DefaultApp（ErpApp）

  if (!isLoggedIn && !bypassAuth) {
    return (
      <Localization>
        <AuthRouter />
      </Localization>
    );
  }

  if (isLoggedIn && current?.onboarded === false) {
    return (
      <Localization>
        <Onboarding />
      </Localization>
    );
  }

  return <DefaultApp />;
}

