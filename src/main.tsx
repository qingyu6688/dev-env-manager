import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          colorBgBase: '#ffffff',
          colorBgLayout: '#eef6ff',
          borderRadius: 6,
          fontFamily:
            'Inter, "Segoe UI", "Microsoft YaHei", Arial, sans-serif',
        },
        components: {
          Button: {
            controlHeight: 34,
          },
          Card: {
            borderRadiusLG: 8,
          },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
