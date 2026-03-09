<template>
  <div>Authenticating... You may close this window.</div>
</template>

<script>
export default {
  mounted() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('access_token');

    if (token && window.opener) {
      window.opener.postMessage({ type: 'gmail-oauth-success', token }, '*');
      setTimeout(() => window.close(), 500);
    } else {
      // Handle case where opener is gone or token missing
      setTimeout(() => window.close(), 2000);
    }
  }
}
</script>
