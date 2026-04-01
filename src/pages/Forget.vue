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
                <button id="clicked" @mouseenter="enterevent" @mouseleave="leaveevent">Submit</button>
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
                if(this.email === '' || this.password === '' || this.confirm === '')
                {
                    this.message = "Please fill all the details";
                    return;
                }
                else if(this.password !== this.confirm)
                {
                    this.message = "Password and Confirm Password are not matched";
                    return;
                }
                else{
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
                            // ✅ BUG 2 FIX: backend now always returns the same message,
                            // so this will never reveal whether an email is registered or not
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
            enterevent(){
                var change = document.getElementById("clicked");
                change.style.background = "white";
                change.style.color = "black";
                change.style.border = "1px solid black";
            },
            leaveevent(){
                var change = document.getElementById("clicked");
                change.style.background = "black";
                change.style.color = "white";
                change.style.border = "1px solid black";
            },
        }
    };
</script>

<style scoped>
/* ✅ BUG 1 FIX: replaced fixed px/% values with flexbox so it works on all screen sizes */
#container {
    background-color: #1e3a8a;
    min-height: 100vh;
    font-family: helvetica;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
}

#box {
    background-color: white;
    width: 100%;
    max-width: 480px;
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    padding: 30px 40px 40px;
    box-sizing: border-box;
}

hr {
    color: black;
}

#headers {
    font-size: 2rem;
    text-align: center;
    letter-spacing: 1px;
    padding-top: 10px;
    color: black;
}

.text {
    display: block;
    width: 100%;
    margin-top: 25px;
    height: 40px;
    padding: 10px 10px;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
}

#clicked {
    display: block;
    width: 100%;
    padding: 12px;
    background-color: black;
    margin-top: 25px;
    color: white;
    border: 1px solid black;
    border-radius: 6px;
    font-weight: bold;
    font-size: 1rem;
    cursor: pointer;
}

#error {
    font-weight: bold;
    color: red;
    margin-top: 10px;
    text-align: center;
}

/* mobile tweaks */
@media (max-width: 480px) {
    #box {
        padding: 24px 20px 32px;
    }
    #headers {
        font-size: 1.5rem;
    }
}
</style>
