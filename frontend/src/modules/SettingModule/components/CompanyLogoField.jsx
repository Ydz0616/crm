import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Image, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

import { settingsAction } from '@/redux/settings/actions';
import { selectSettings } from '@/redux/settings/selectors';
import { FILE_BASE_URL } from '@/config/serverApiConfig';
import useLanguage from '@/locale/useLanguage';

export default function CompanyLogoField() {
  const translate = useLanguage();
  const dispatch = useDispatch();
  const { result } = useSelector(selectSettings);
  const [uploading, setUploading] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);

  const companyLogo = result?.company_settings?.company_logo;
  const logoSrc = companyLogo ? `${FILE_BASE_URL}${companyLogo}?v=${cacheBust}` : null;

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error(translate('You can only upload JPG/PNG file!'));
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(translate('Image must smaller than 5MB!'));
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // 用相对路径避免 axios baseURL 双前缀 bug（详见 auth.service.js 注释）
      const response = await axios.patch(
        'setting/upload/company_logo',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        }
      );
      if (response.data.success) {
        message.success(translate('Logo uploaded successfully'));
        dispatch(settingsAction.list({ entity: 'setting' }));
        setCacheBust(Date.now());
        onSuccess(response.data);
      } else {
        const msg = response.data.message || translate('Upload failed');
        message.error(msg);
        onError(new Error(msg));
      }
    } catch (err) {
      message.error(err.response?.data?.message || err.message);
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', gap: 24 }}>
      <div>
        <div style={{ marginBottom: 8, fontSize: 14, color: 'rgba(0,0,0,0.88)' }}>
          {translate('Company Logo')}
        </div>
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt="company logo"
            width={240}
            height={80}
            style={{
              objectFit: 'contain',
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              padding: 4,
              borderRadius: 4,
            }}
            preview={false}
          />
        ) : (
          <div
            style={{
              width: 240,
              height: 80,
              background: '#fafafa',
              border: '1px dashed #d9d9d9',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bfbfbf',
            }}
          >
            {translate('No logo set')}
          </div>
        )}
      </div>
      <Upload
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        accept="image/png, image/jpeg"
        showUploadList={false}
      >
        <Button icon={<UploadOutlined />} loading={uploading} size="large">
          {translate('Upload Logo')}
        </Button>
      </Upload>
    </div>
  );
}
