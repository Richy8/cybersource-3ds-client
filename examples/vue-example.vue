<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { WebClient } from '../src';

const status = ref('');
const expiry = ref({ month: '12', year: '2028' });
const client = new WebClient();
const flexInstance = ref<any>(null);

onMounted(async () => {
  try {
    // Step 0: Polling for library
    await client.waitForLibrary();

    const captureContext = await fetchCaptureContext();
    flexInstance.value = await client.setupFlexMicroform(
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
  } catch (error: any) {
    console.error('Flex init failed:', error);
  }
});

onUnmounted(() => {
  client.destroy();
});

async function handlePayment() {
  if (!flexInstance.value) return;

  try {
    status.value = 'Processing...';

    // 1. Tokenize (pass expiry)
    const { token } = await flexInstance.value.tokenize(expiry.value.month, expiry.value.year);

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
      status.value = '✅ Payment successful!';
      await client.closeChallengeModal();
    } else {
      status.value = '❌ Authentication failed';
    }

  } catch (error: any) {
    status.value = `❌ Error: ${error.message}`;
  }
}

async function fetchCaptureContext() {
  const res = await fetch('/api/flex/capture-context', { method: 'POST' });
  const data = await res.json();
  return data.captureContext;
}
</script>

<template>
  <div>
    <h1>Payment Form</h1>
    <div id="card-container"></div>
    <button @click="handlePayment">Pay Now</button>
    <p v-if="status">{{ status }}</p>
  </div>
</template>
