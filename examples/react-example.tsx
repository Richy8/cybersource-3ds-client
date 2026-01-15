import React, { useState, useEffect } from 'react';
import { WebClient } from '../src'; // Using relative path for best example relevance within the repo

function PaymentForm() {
  const [status, setStatus] = useState<string>('');
  const [expiry] = useState({ month: '12', year: '2028' });
  const [client] = useState(() => new WebClient());
  const [flexInstance, setFlexInstance] = useState<any>(null);

  useEffect(() => {
    async function initFlex() {
      try {
        // Step 0: Polling for library
        await client.waitForLibrary();

        const captureContext = await fetchCaptureContext();
        const flex = await client.setupFlexMicroform(
          'card-container',
          captureContext,
          {
            layout: 'inline',
            customStyles: {
              labelColor: '#4b5563',
              labelFontSize: '14px',
              labelFontWeight: '600',
              borderColor: '#e5e7eb',
              borderRadius: '10px'
            }
          }
        );
        setFlexInstance(flex);
      } catch (error) {
        console.error('Flex init failed:', error);
      }
    }

    initFlex();
    return () => client.destroy();
  }, [client]);

  const handlePayment = async () => {
    if (!flexInstance) return;

    try {
      setStatus('Processing...');

      // 1. Tokenize (pass expiry)
      const { token } = await flexInstance.tokenize(expiry.month, expiry.year);

      // 2. Start Enrollment (Backend Call)
      // These values would typically come from your backend's enrollment response
      const enrollmentData = {
        stepUpUrl: 'https://...',
        accessToken: '...',
        transactionId: 'TXN_' + Date.now()
      };

      // 3. Collect device info
      const deviceInfo = await client.collectBrowserInfo();
      console.log('Device Info:', deviceInfo);

      // 4. 3DS Challenge
      const auth = await client.showChallengeModal(enrollmentData.stepUpUrl, enrollmentData.accessToken, {
        transactionId: enrollmentData.transactionId
      });

      if (auth.success) {
        setStatus('✅ Payment successful!');
        await client.closeChallengeModal();
      } else {
        setStatus('❌ Authentication failed');
      }

    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Payment Form</h1>
      <div id="card-container"></div>
      <button onClick={handlePayment}>Pay Now</button>
      {status && <p>{status}</p>}
    </div>
  );
}

async function fetchCaptureContext() {
  const res = await fetch('/api/flex/capture-context', { method: 'POST' });
  const data = await res.json();
  return data.captureContext;
}

export default PaymentForm;
