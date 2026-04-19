import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectSettings } from '@/redux/settings/selectors';

import { Button, Form, message } from 'antd';
import Loading from '@/components/Loading';
import useLanguage from '@/locale/useLanguage';
import axios from 'axios';
import { API_BASE_URL } from '@/config/serverApiConfig';

export default function UpdateSettingForm({ config, children, withUpload, uploadSettingKey }) {
  let { entity, settingsCategory } = config;
  const dispatch = useDispatch();
  const { result, isLoading } = useSelector(selectSettings);
  const translate = useLanguage();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  const onSubmit = async (fieldsValue) => {
    if (withUpload) {
      if (fieldsValue.file && fieldsValue.file.length > 0) {
        try {
          setUploading(true);

          const formData = new FormData();
          formData.append('file', fieldsValue.file[0].originFileObj);

          const response = await axios.patch(
            `${API_BASE_URL}setting/upload/${uploadSettingKey}`,
            formData,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
              withCredentials: true,
            }
          );

          if (response.data.success) {
            message.success('Logo uploaded successfully');
            // 重新加载设置
            dispatch(settingsAction.list({ entity }));
          } else {
            message.error('Failed to upload logo: ' + response.data.message);
          }
          
          setUploading(false);
        } catch (error) {
          console.error('上传出错:', error);
          message.error('Upload failed: ' + (error.response?.data?.message || error.message));
          setUploading(false);
        }
      } else {
        console.error('No file selected for upload');
        message.error('Please select a file to upload');
      }
    } else {
      const settings = [];

      for (const [key, value] of Object.entries(fieldsValue)) {
        settings.push({ settingKey: key, settingValue: value });
      }

      dispatch(settingsAction.updateMany({ entity, jsonData: { settings } }));
    }
  };

  useEffect(() => {
    const current = result[settingsCategory];

    form.setFieldsValue(current);
  }, [result]);

  return (
    <div>
      <Loading isLoading={isLoading || uploading}>
        <Form
          form={form}
          onFinish={onSubmit}
          // onValuesChange={handleValuesChange}
          labelCol={{ span: 10 }}
          labelAlign="left"
          wrapperCol={{ span: 16 }}
        >
          {children}
          <Form.Item
            style={{
              display: 'inline-block',
              paddingRight: '5px',
            }}
          >
            <Button type="primary" htmlType="submit" loading={uploading}>
              {translate('Save')}
            </Button>
          </Form.Item>
        </Form>
      </Loading>
    </div>
  );
}
