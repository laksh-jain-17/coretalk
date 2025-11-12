<template>
    <div id="container">
        <div id="box">
            <form @submit.prevent="passed">
                <h2 id="headers">Forget Password</h2>
                <hr>
                <input v-model="email" @keypress="erase" class="text" type="email" placeholder="Email address">
                <input v-model="password" @keypress="erase" class="text" type="password" placeholder="Password">
                <input v-model="confirm" @keypress="erase" class="text" type="password" placeholder="Confirm Password">
                <p id="error" v-if="message">{{ message }}</p>
                <button id="clicked" @mouseenter="enterevent" @mouseleave=leaveevent>Submit</button>
            </form>
        </div>
    </div>
</template>
<script>
    export default{
        data(){
            return{
                email : '',
                password : '',
                confirm : '',
                message : '',
            }
        },
        methods:{
            async passed(){
                /*if(this.email)
                {
                    if this email does not exist then there is no point to just forget password thing thus
                    it should throw an exception.
                }*/
                if(this.email === '' || this.password === '' || this.confirm === '')
                {
                    console.log("Empty credentials");
                    this.message = "Please fill all the details";
                    return;
                }
                else if(this.password !== this.confirm)
                {
                    console.log("Passwords are not matched");
                    this.message = "Password and Confirm Password are not matched";
                    return;
                }
                else{
                    console.log("Passed");
                    try
                    {
                        const response = await this.$axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forget`,{
                            email : this.email,
                            password : this.password
                        });
                        if(response.data.success)
                        {
                            alert("Your Password updated successfully");
                            this.$router.push('/Login');
                        }
                        else{
                            this.message = "Something went wrong";
                        }
                    }
                    catch(err)
                    {
                        if(err.response && err.response.data && err.response.data.message)
                        {
                            this.message = err.response.data.message;
                        }
                        else{
                            this.message = "Failed to update password.";
                        }
                    }
                }
            },
            erase(){
                this.message = '';
            },
	    enterevent()
	    {
		var change = document.getElementById("clicked");
		change.style.background = "white";
		change.style.color = "black";
		change.style.border = "1px solid black";
	    },
	    leaveevent()
	    {
		var change = document.getElementById("clicked");
		change.style.background = "black";
		change.style.color = "white";
		change.style.border = "1px solid black";
	    },
        }
    };
</script>
<style>
#container{
    background-color: #1e3a8a;
    height: 100vh;
    font-family: helvetica;
}
#box {
  background-color: white;
  position: absolute;
  top: 130px;
  left: 50%;
  transform: translateX(-50%);
  height: 60%;
  width: 40%;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
}
hr{
    color:black;
}
#headers{
    font-size: 2rem;
  text-align:center;
  letter-spacing: 1px;
  padding-top:30px;
  color:black;
}
.text{
    display:block;
    margin-top:30px;
    margin-left:160px;
    height:40px;
    width:300px;
    padding:10px 0 10px 10px;
}
#clicked{
  width: 60%;
  padding: 12px;
  background-color: black;
  margin:30px 0 0 130px;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
}
#error {
  font-weight: bold;
  color: red;
  margin-top: 5px;
  text-align: center;
}

</style>
