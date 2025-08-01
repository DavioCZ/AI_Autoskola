import { Turnstile } from '@marsidev/react-turnstile';
import { FC, useEffect } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

const TurnstileWidget: FC<TurnstileWidgetProps> = ({ onSuccess, onExpire, onError }) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    console.error("VITE_TURNSTILE_SITE_KEY is not set in .env file.");
    return <div>Captcha configuration error.</div>;
  }

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onSuccess}
      onExpire={onExpire}
      onError={onError}
      options={{
        theme: 'light',
      }}
    />
  );
};

export default TurnstileWidget;
