// Sync hidden <select id="scope"> with visual Bootstrap dropdown
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const select = document.getElementById('scope');
    const btn = document.getElementById('scopeDropdownBtn');
    const menu = document.getElementById('scopeDropdownMenu');
    if(!select || !btn || !menu) return;

    // Populate menu from select options
    Array.from(select.options).forEach(function(opt){
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'dropdown-item';
      a.href = '#';
      a.dataset.value = opt.value;
      a.textContent = opt.textContent;
      if(opt.selected) a.classList.add('active');
      a.addEventListener('click', function(e){
        e.preventDefault();
        // update button text
        btn.textContent = opt.textContent;
        // update hidden select value and dispatch change
        select.value = opt.value;
        const evt = new Event('change', {bubbles: true});
        select.dispatchEvent(evt);
        // active state
        menu.querySelectorAll('.dropdown-item').forEach(function(it){ it.classList.remove('active'); });
        a.classList.add('active');
      });
      li.appendChild(a);
      menu.appendChild(li);
    });

    // initialize button label from selected option
    const sel = select.options[select.selectedIndex];
    if(sel) btn.textContent = sel.textContent;
  });
})();
