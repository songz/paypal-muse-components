/* @flow */


export default () => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.setAttribute('src', 'https://www.paypalobjects.com/ppshopping/9ac/964d282/9ac/964d282b/index.html');
  document.body.appendChild(iframe);

  return iframe;
};
