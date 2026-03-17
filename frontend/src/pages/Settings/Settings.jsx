import {
  SettingOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileImageOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Button, Result } from 'antd'; // Imported from antd

import TabsContent from '@/components/TabsContent/TabsContent';

import CompanyLogoSettings from './CompanyLogoSettings';
import GeneralSettings from './GeneralSettings';
import CompanySettings from './CompanySettings';
import FinanceSettings from './FinanceSettings';
import MoneyFormatSettings from './MoneyFormatSettings';

import useLanguage from '@/locale/useLanguage';
import { useParams } from 'react-router-dom';

export default function Settings() {
  const translate = useLanguage();
  const { settingsKey } = useParams();
  const content = [
    {
      key: 'general_settings',
      label: translate('General Settings'),
      icon: <SettingOutlined />,
      children: <GeneralSettings />,
    },
    {
      key: 'company_settings',
      label: translate('Company Settings'),
      icon: <TrophyOutlined />,
      children: <CompanySettings />,
    },
    {
      key: 'company_logo',
      label: translate('Company Logo'),
      icon: <FileImageOutlined />,
      children: <CompanyLogoSettings />,
    },
    {
      key: 'currency_settings',
      label: translate('Currency Settings'),
      icon: <DollarOutlined />,
      children: <MoneyFormatSettings />,
    },
    {
      key: 'finance_settings',
      label: translate('Finance Settings'),
      icon: <CreditCardOutlined />,
      children: <FinanceSettings />,
    },
  ];

  const pageTitle = translate('Settings');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '40px' }}>
      <TabsContent defaultActiveKey={settingsKey} content={content} pageTitle={pageTitle} />
      <Result
        status="info"
        title={'Ola ERP CRM'}
        subTitle={translate('Contact us if you need extra help')}
        extra={
          <>
            <p>
              Website : <a href="https://www.olajob.cn">www.olajob.cn</a>{' '}
            </p>
            <p>
              GitHub :{' '}
              <a href="https://github.com/Ydz0616/crm">
                https://github.com/ydz0616/crm
              </a>
            </p>
            <Button
              type="primary"
              onClick={() => {
                window.open(`https://www.olajob.cn`);
              }}
            >
              {translate('Contact us')}
            </Button>
          </>
        }
      />
    </div>
  );
}
