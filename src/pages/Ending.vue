<template>
  <div id="end-container">
    <div id="message-box">
      <h2>Your meeting is over</h2>
      <p>Take some rest or join another session</p>
      <div id="button-drawer">
        <!-- <button class="btn-secondary" @click="rejoined">Rejoin</button> -->
        <button class="btn-primary" @click="returned">Return to Schedule</button>
        <button v-if="!isGuest" class="btn-logout" @click="logoutuser">Log Out</button>
      </div>
    </div>

    <div id="feedback-box" v-if="!isGuest">
      <h3>How was your meeting?</h3><br>
      <p>If you want to express something or have any issue then write a review.</p>

      <textarea id="review" placeholder="Type your review here..."></textarea>
      <button class="btn-submit" @click="submitReview">Submit</button>
    </div>
  </div>
</template>

<script>
import { logout } from '../auth';
import axios from 'axios';

export default {
  name: 'Ending',
  data() {
    return {
      isGuest: localStorage.getItem('isGuest') === 'true',
    };
  },
  mounted() {
    window.jistory.pushState(null,'',window.location.href);
    window.addEventListener('popstate',this.preventBack);
  },
  beforeUnmount() {
    window.removeEventListener('popstate',this.preventBack);
  },
  methods: {
    preventBack() {
      window.history.pushState(null,'',window.location.href);
    },
    returned() {
      this.$router.push('/Schedule');
    },
    logoutuser() {
      logout();
      this.$router.push('/Login');
    },
    async submitReview() {
      const comment = document.getElementById('review').value.trim();

      if (!comment) {
        alert('Please write something before submitting.');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          alert('Please login first.');
          this.$router.push('/Login');
          return;
        }

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/reviews/add`,
          { comment },
          { 
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        alert('Review submitted. Thank you!');
        document.getElementById('review').value = '';
      } catch (err) {
        console.error('Error submitting review:', err);
        alert('Failed to submit review. Please try again.');
      }
    }
  },
};
</script>

<style scoped>
/* General body styles */
#end-container {
  font-family: 'Helvetica', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: #f9f9f9;
  min-height: 100vh;
}

/* Message box */
#message-box {
  text-align: center;
  background-color: #ffffff;
  padding: 30px 40px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
  width:100%;
  max-width:500px;
}

#message-box h2 {
  color: #1e3a8a;
  margin-bottom: 10px;
  font-size: 2rem;
}

#message-box p {
  color: #333;
  font-size: 1rem;
  margin-bottom: 20px;
}

/* Buttons */
#button-drawer {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
}

button {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #1e3a8a;
  color: white;
}

.btn-primary:hover {
  /*background-color: #14306b;*/
  background-color:white;
  color:#14306b;
  border:1px solid #14306b;
}

.btn-logout {
  background-color: #6b7280; /* gray-500 */
  color: white;
}

.btn-logout:hover {
 /* background-color: #4b5563;  gray-600 */
 background-color:white;
 color:#4b5563;
 border:1px solid #4b5563;
}

/* Feedback box */
#feedback-box {
  width: 100%;
  max-width: 500px;
  background-color: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}

#feedback-box h3 {
  color: #1e3a8a;
  margin-bottom: 10px;
}

#feedback-box p {
  color: #333;
  font-size: 0.95rem;
  margin-bottom: 15px;
}

#review {
  width: 100%;
  min-height: 120px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db; /* gray-300 */
  margin-bottom: 15px;
  resize: vertical;
  font-family: 'Helvetica', sans-serif;
}

.btn-submit {
  background-color: #10b981; /* green-500 */
  color: white;
  padding: 10px 25px;
  border-radius: 8px;
}

.btn-submit:hover {
  /*background-color: #059669;  green-600 */
  background-color:white;
  color:#059669;
  border:1px solid #059669;
}

/* Responsive */
@media (max-width: 768px) {
  #message-box, #feedback-box {
    padding: 20px;
    margin: 20px 10px;
  }

  #message-box h2 {
    font-size: 1.6rem;
  }

  #feedback-box h3 {
    font-size: 1.2rem;
  }
}
</style>
