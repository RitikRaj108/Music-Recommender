import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '../Components/home.css';

const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate(); 

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Email:', email);
    console.log('Password:', password);
  };

  const handlesignup = () => {
    navigate('/signup'); // Use navigate directly here
  };

  return (
    <div className='whole-page'>
      <div className="left-div">
        <div class="welcome-box">
        <p class="welcome-msg">Welcome to Recommender-pro</p>
        </div>

      </div>

      <div className="sign-in-page">
        <div class="form-box"><h2>Sign In To your Account</h2>
        <form onSubmit={handleSubmit} className="form-holder">
          <div>
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="sign-in-form">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Sign In</button>
          <p 
            className="sign-up-text" // Updated to use className
            onClick={handlesignup}
             // Inline styling for hover effects
          >
            Don't have an Account? Sign Up
          </p>
        </form>
      </div></div>
        
    </div>
  );
};

export default SignInPage;
