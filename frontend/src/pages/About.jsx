import { Button, Result } from 'antd';

import useLanguage from '@/locale/useLanguage';

const About = () => {
  const translate = useLanguage();
  return (
    <Result
      status="info"
      title={'YDZ'}
      subTitle={translate('Contact if need extra help')}
      extra={
        <>
          <p>
            Website : <a href="https://www.test.com">www.test.com</a>{' '}
          </p>
          <p>
            GitHub :{' '}
            <a href="https://github.com/test/test.com">
              https://github.com/ydz0616/crm
            </a>
          </p>
          <Button
            type="primary"
            onClick={() => {
              window.open(`https://www.test.com`);
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
