document.addEventListener('DOMContentLoaded', function (ev) {

  var cred = {};
  var server = 'nethvoice.nethesis.it';
  var openBtn = document.getElementById('open');
  var loginBtn = document.getElementById('login');
  var logoutBtn = document.getElementById('logout');
  var loginPage = document.getElementById('login-page');
  var openPage = document.getElementById('open-page');

  (function init() {
    console.log('start');
    readCred();
    if (!cred) {
      showLoginPage();
    } else {
      showOpenPage();
    }
  })();

  openBtn.onclick = function () {
    if (window.confirm('Open door ?')) {
      doOpen(cred.username, cred.password, function (err) {
        if (err) {
          alert('Error opening door');
        } else {
          alert('door opened');
        }
      });
    } else {
      alert('No door opened !');
    }
  };

  loginBtn.onclick = function () {
    var user = document.getElementById('username').value
    var pwd = document.getElementById('password').value
    doLogin(user, pwd, function (err) {
      if (!err) {
        showOpenPage();
        hideLoginPage();
        readCred();
      }
    });
  };

  logoutBtn.onclick = function () {
    localStorage.clear();
    showLoginPage();
    hideOpenPage();
  };

  function readCred() {
    cred = localStorage.getItem('cred');
    if (cred !== null) {
      cred = JSON.parse(cred);
      cred.password = atob(cred.password);
    }
  }

  function showLoginPage() {
    loginPage.classList.remove('hide');
  }

  function hideLoginPage() {
    loginPage.classList.add('hide');
  }

  function showOpenPage() {
    openPage.classList.remove('hide');
  }

  function hideOpenPage() {
    openPage.classList.add('hide');
  }

  function login(user, pwd, cb) {
    var o = {
      username: user,
      password: pwd
    };
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://' + server + '/webrest/authentication/login', true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState < 4) {
        return;
      }
      if (xhr.readyState === 4 && xhr.status === 401 && xhr.getResponseHeader('www-authenticate').indexOf('Digest') === 0) {
        var nonce = xhr.getResponseHeader('www-authenticate').split(' ')[1];
        var shaObj = new jsSHA('SHA-1', 'TEXT');
        shaObj.setHMACKey(pwd, 'TEXT');
        shaObj.update(user + ':' + pwd + ':' + nonce);
        var token = shaObj.getHMAC('HEX');
        cb(null, token);
      } else {
        cb('error login');
      }
    }
    xhr.send(JSON.stringify(o));
  }

  function logout(username, token, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://' + server + '/webrest/authentication/logout', true);
    xhr.setRequestHeader('Authorization', username + ':' + token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState < 4) {
        return;
      }
      if (xhr.readyState === 4 && xhr.status === 200) {
        cb();
      } else {
        cb('error logout');
      }
    }
    xhr.send();
  }

  function getExten(user, token, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://' + server + '/webrest/astproxy/extensions', true);
    xhr.setRequestHeader('Authorization', user + ':' + token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState < 4) {
        return;
      }
      if (xhr.readyState === 4 && xhr.status === 200) {
        cb(null, xhr.response);
      } else {
        cb('error astproxy/extensions');
      }
    }
    xhr.send();
  }

  function openDoor(user, token, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://' + server + '/webrest/streaming/open', true);
    xhr.setRequestHeader('Authorization', user + ':' + token);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState < 4) {
        return;
      }
      if (xhr.readyState === 4 && xhr.status === 200) {
        cb(null);
      } else {
        cb('error streaming/open');
      }
    }
    xhr.send(JSON.stringify({ id: 'vs_porta' }));
  }

  function doGetExten(user, pwd, cb) {
    login(user, pwd, function (err, token) {
      if (err) {
        console.log(err);
        cb(err);
        return;
      }
      console.log('login successful');
      console.log('authentication token: ', token);
      getExten(user, token, function (err1, extens) {
        if (err1) {
          console.log(err1);
          cb(err1);
          return;
        }
        console.log('get exten successful !');
        console.log(extens);

        logout(user, token, function (err2) {
          if (err2) {
            console.log(err2);
            cb(err2);
            return;
          }
          console.log('logout successful');
          cb();
        });
      });
    });
  }

  function doLogin(user, pwd, cb) {
    login(user, pwd, function (err, token) {
      if (err) {
        console.log(err);
        cb(err);
        return;
      }
      console.log('login successful');
      console.log('authentication token:', token);

      logout(user, token, function (err2) {
        if (err2) {
          console.log(err2);
          cb(err2);
          return;
        }
        console.log('logout successful');
        localStorage.setItem('cred', JSON.stringify({
          username: user,
          password: btoa(pwd)
        }));
        cb();
      });
    });
  }

  function doOpen(user, pwd, cb) {
    login(user, pwd, function (err, token) {
      if (err) {
        console.log(err);
        cb(err);
        return;
      }
      console.log('login successful');
      console.log('authentication token: ', token);
      openDoor(user, token, function (err1) {
        if (err1) {
          console.log(err1);
          cb(err1);
          return;
        }
        console.log('open door successful !');

        logout(user, token, function (err2) {
          if (err2) {
            console.log(err2);
            cb(err2);
            return;
          }
          console.log('logout successful');
          cb();
        });
      });
    });
  }
});