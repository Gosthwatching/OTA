(function(){
  function syncDropdown(selectId, btnId, menuId) {
    const select = document.getElementById(selectId);
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if(!select || !btn || !menu) return;

    function updateButtonLabel() {
      const selected = select.options[select.selectedIndex];
      btn.textContent = selected ? selected.textContent : '';
    }

    function setActiveItem(value) {
      menu.querySelectorAll('.dropdown-item').forEach(function(item){
        item.classList.toggle('active', item.dataset.value === value);
      });
    }

    function populateMenu() {
      menu.innerHTML = '';

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
          select.value = opt.value;
          const evt = new Event('change', {bubbles: true});
          select.dispatchEvent(evt);
          updateButtonLabel();
          setActiveItem(opt.value);
        });
        li.appendChild(a);
        menu.appendChild(li);
      });

      updateButtonLabel();
      setActiveItem(select.value);
    }

    select.addEventListener('change', function() {
      updateButtonLabel();
      setActiveItem(select.value);
    });

    select.addEventListener('dropdown:optionsChanged', populateMenu);
    populateMenu();
  }

  document.addEventListener('DOMContentLoaded', function(){
    syncDropdown('department', 'departmentDropdownBtn', 'departmentDropdownMenu');
    syncDropdown('zone', 'zoneDropdownBtn', 'zoneDropdownMenu');
  });
})();
