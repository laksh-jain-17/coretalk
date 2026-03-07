<template>
  <div>Authenticating...</div>
</template>

<script>
export default {
  mounted() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('access_token');
    if (token && window.opener) {
      window.opener.postMessage({ type: 'gmail-oauth-success', token }, '*');
      window.close();
    }
  }
}
</script>
