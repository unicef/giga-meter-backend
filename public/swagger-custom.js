(async function () {
  document.body.classList.add('custom-styling');
  document.head.innerHTML +=
    '<link rel="preconnect" href="https://fonts.googleapis.com">';
  document.head.innerHTML +=
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
  document.head.innerHTML += `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"></link>`;
})();

function main() {
  document
    .querySelectorAll('.opblock-tag-section')
    .forEach((el) => el.classList.add('hide'));
  document
    .querySelectorAll('.opblock-tag.no-desc')
    ?.forEach((el) => el.classList.add('pointer-none'));
  document
    .querySelectorAll('.models .model-container')
    .forEach((el) => el.classList.add('hide'));
  document
    .querySelector('.models .models-control')
    ?.classList.add('pointer-none');
}

window.addEventListener('load', function () {
  main();
});
