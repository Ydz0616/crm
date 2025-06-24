import { lazy } from 'react';

import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customer = lazy(() => import('@/pages/Customer'));
const Factory = lazy(() => import('@/pages/Factory'));  
const Invoice = lazy(() => import('@/pages/Invoice'));
const InvoiceCreate = lazy(() => import('@/pages/Invoice/InvoiceCreate'));

const InvoiceRead = lazy(() => import('@/pages/Invoice/InvoiceRead'));
const InvoiceUpdate = lazy(() => import('@/pages/Invoice/InvoiceUpdate'));
const InvoiceRecordPayment = lazy(() => import('@/pages/Invoice/InvoiceRecordPayment'));
const Quote = lazy(() => import('@/pages/Quote/index'));
const QuoteCreate = lazy(() => import('@/pages/Quote/QuoteCreate'));
const QuoteRead = lazy(() => import('@/pages/Quote/QuoteRead'));
const QuoteUpdate = lazy(() => import('@/pages/Quote/QuoteUpdate'));
const Payment = lazy(() => import('@/pages/Payment/index'));
const PaymentRead = lazy(() => import('@/pages/Payment/PaymentRead'));
const PaymentUpdate = lazy(() => import('@/pages/Payment/PaymentUpdate'));

const PurchaseOrder = lazy(() => import('@/pages/PurchaseOrder/index'));
const PurchaseOrderCreate = lazy(() => import('@/pages/PurchaseOrder/OrderCreate'));
const PurchaseOrderRead = lazy(() => import('@/pages/PurchaseOrder/OrderRead'));
const PurchaseOrderUpdate = lazy(() => import('@/pages/PurchaseOrder/OrderUpdate'));

// Comparison Module
const Comparison = lazy(() => import('@/pages/Comparison'));
const ComparisonCreate = lazy(() => import('@/pages/Comparison/ComparisonCreate'));
const ComparisonRead = lazy(() => import('@/pages/Comparison/ComparisonRead'));
const ComparisonUpdate = lazy(() => import('@/pages/Comparison/ComparisonUpdate'));

const Settings = lazy(() => import('@/pages/Settings/Settings'));
const PaymentMode = lazy(() => import('@/pages/PaymentMode'));
const Taxes = lazy(() => import('@/pages/Taxes'));
const Currencies = lazy(() => import('@/pages/Currencies'));
const Profile = lazy(() => import('@/pages/Profile'));

const Merchandise = lazy(() => import('@/pages/Merchandise'));  
// const People = lazy(() => import('@/pages/People'));
// const Company = lazy(() => import('@/pages/Company'));

const About = lazy(() => import('@/pages/About'));

// 添加价格搜索页面导入
import PriceSearch from '@/pages/PriceSearch';

let routes = {
  expense: [],
  default: [
    {
      path: '/login',
      element: <Navigate to="/" />,
    },
    {
      path: '/logout',
      element: <Logout />,
    },
    {
      path: '/about',
      element: <About />,
    },
    {
      path: '/',
      element: <Dashboard />,
    },
    {
      path: '/customer',
      element: <Customer />,
    },
    {
      path: '/merchandise',
      element: <Merchandise />,
    },
    {
      path: '/factory',
      element: <Factory />,
    },  
    {
      path: '/purchaseorder',
      element: <PurchaseOrder />,
    },
    {
      path: '/purchaseorder/create',
      element: <PurchaseOrderCreate />,
    },
    {
      path: '/purchaseorder/read/:id',
      element: <PurchaseOrderRead />,
    },
    {
      path: '/purchaseorder/update/:id',
      element: <PurchaseOrderUpdate />,
    },
    

    // {
    //   path: '/people',
    //   element: <People />,
    // },
    // {
    //   path: '/company',
    //   element: <Company />,
    // },
    {
      path: '/invoice',
      element: <Invoice />,
    },
    {
      path: '/invoice/create',
      element: <InvoiceCreate />,
    },
    {
      path: '/invoice/read/:id',
      element: <InvoiceRead />,
    },
    {
      path: '/invoice/update/:id',
      element: <InvoiceUpdate />,
    },
    {
      path: '/invoice/pay/:id',
      element: <InvoiceRecordPayment />,
    },
    {
      path: '/quote',
      element: <Quote />,
    },
    {
      path: '/quote/create',
      element: <QuoteCreate />,
    },
    {
      path: '/quote/read/:id',
      element: <QuoteRead />,
    },
    {
      path: '/quote/update/:id',
      element: <QuoteUpdate />,
    },
    {
      path: '/payment',
      element: <Payment />,
    },
    {
      path: '/payment/read/:id',
      element: <PaymentRead />,
    },
    {
      path: '/payment/update/:id',
      element: <PaymentUpdate />,
    },

    {
      path: '/settings',
      element: <Settings />,
    },
    {
      path: '/settings/edit/:settingsKey',
      element: <Settings />,
    },
    {
      path: '/payment/mode',
      element: <PaymentMode />,
    },
    {
      path: '/taxes',
      element: <Taxes />,
    },
    {
      path: '/currencies',
      element: <Currencies />,
    },

    {
      path: '/profile',
      element: <Profile />,
    },
    {
      path: '/comparison',
      element: <Comparison />,
    },
    {
      path: '/comparison/create',
      element: <ComparisonCreate />,
    },
    {
      path: '/comparison/read/:id',
      element: <ComparisonRead />,
    },
    {
      path: '/comparison/update/:id',
      element: <ComparisonUpdate />,
    },
    {
      path: '/pricesearch',
      element: <PriceSearch />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ],
};

export default routes;
