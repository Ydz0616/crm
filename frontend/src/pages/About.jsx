import { Button, Result } from 'antd';

import useLanguage from '@/locale/useLanguage';

const About = () => {
  const translate = useLanguage();
  return (
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
  );
};

export default About;
