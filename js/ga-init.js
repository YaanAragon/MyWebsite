(function(){
  // Create a script element for GA
  var gaScript = document.createElement('script');
  gaScript.type = 'text/plain'; // Cookiebot won't execute until consent
  gaScript.setAttribute('data-cookieconsent', 'statistics'); // GA is "statistics" category in Cookiebot
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-WRMFW9VXZL';
  document.head.appendChild(gaScript);

  // Create another inline script for gtag config
  var gaInit = document.createElement('script');
  gaInit.type = 'text/plain';
  gaInit.setAttribute('data-cookieconsent', 'statistics');
  gaInit.text = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-WRMFW9VXZL');
  `;
  document.head.appendChild(gaInit);
})();


/* (function(){
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-WRMFW9VXZL';
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-WRMFW9VXZL');
})(); */