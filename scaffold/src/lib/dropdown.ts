/* Dropdown behaviour, in a module rather than inline in the component, so
   the import graph decides the order instead of the bundler. A page that
   drives its dropdowns (the ballot builder rebuilds three of them from the
   county) imports this and calls initDropdowns() itself; ES imports are
   evaluated before the importing module's body, so the listeners always
   exist before the page dispatches at them.

   Doing this inline cost a silent bug twice: the page's script and the
   component's script landed in one chunk with the page first, dd:setoptions
   fired into the void, and a restored selection vanished without an error. */

const started = new WeakSet<HTMLElement>();

  interface DDOption { value: string; label: string }

function initDropdown(root: HTMLElement) {
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const trigger = q<HTMLButtonElement>('[data-dd-trigger]');
  const panel = q<HTMLElement>('[data-dd-panel]');
  const list = q<HTMLElement>('[data-dd-list]');
  const native = q<HTMLSelectElement>('[data-dd-native]');
  const labelEl = q<HTMLElement>('[data-dd-label]');
  const search = q<HTMLInputElement>('[data-dd-search]');
  const nomatch = q<HTMLElement>('[data-dd-nomatch]');
  const chevDown = q<HTMLElement>('[data-dd-chev-down]');
  const chevUp = q<HTMLElement>('[data-dd-chev-up]');
  if (!trigger || !panel || !list || !native) return;

  const placeholder = native.options[0]?.textContent ?? '';
  const opts = () => Array.from(list.querySelectorAll<HTMLElement>('[data-dd-option]'));
  const visible = () => opts().filter((o) => !o.hidden);

  function setOpen(open: boolean) {
    panel!.hidden = !open;
    trigger!.setAttribute('aria-expanded', String(open));
    if (chevDown) chevDown.hidden = open;
    if (chevUp) chevUp.hidden = !open;
    if (open) {
      (search ?? list)!.focus();
      setActive(opts().find((o) => o.getAttribute('aria-selected') === 'true') ?? visible()[0]);
    }
  }

  function setActive(el: HTMLElement | undefined) {
    opts().forEach((o) => o.removeAttribute('data-active'));
    if (el) {
      el.setAttribute('data-active', 'true');
      el.scrollIntoView?.({ block: 'nearest' });
    }
  }

  function commit(value: string, emit = true) {
    root.setAttribute('data-value', value);
    const hit = opts().find((o) => o.getAttribute('data-dd-option') === value);
    if (labelEl) labelEl.textContent = hit?.querySelector('span')?.textContent ?? placeholder;
    opts().forEach((o) => {
      const on = o.getAttribute('data-dd-option') === value;
      o.setAttribute('aria-selected', String(on));
      const check = o.querySelector<HTMLElement>('[data-dd-check]');
      if (check) check.hidden = !on;
    });
    if (native!.value !== value) native!.value = value;
    if (emit) root.dispatchEvent(new CustomEvent('dd:change', { detail: { value }, bubbles: true }));
  }

  function filter(needle: string) {
    const n = needle.trim().toLowerCase();
    let shown = 0;
    opts().forEach((o) => {
      const hit = !n || (o.getAttribute('data-dd-text') || '').includes(n);
      o.hidden = !hit;
      if (hit) shown++;
    });
    if (nomatch) nomatch.classList.toggle('hidden', shown > 0);
    setActive(visible()[0]);
  }

  trigger.addEventListener('click', () => { if (!trigger.disabled) setOpen(panel.hidden); });
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-dd-option]');
    if (!li) return;
    commit(li.getAttribute('data-dd-option') || '');
    setOpen(false);
    trigger.focus();
  });
  native.addEventListener('change', () => commit(native.value));
  search?.addEventListener('input', () => filter(search.value));

  function onKey(e: KeyboardEvent) {
    const items = visible();
    const at = items.findIndex((o) => o.getAttribute('data-active') === 'true');
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(items[Math.min(at + 1, items.length - 1)] ?? items[0]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(items[Math.max(at - 1, 0)]); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const el = items[at] ?? items[0];
      if (el) { commit(el.getAttribute('data-dd-option') || ''); setOpen(false); trigger!.focus(); }
    } else if (e.key === 'Escape') { setOpen(false); trigger!.focus(); }
  }
  search?.addEventListener('keydown', onKey);
  list.addEventListener('keydown', onKey);
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) setOpen(false);
  });

  root.addEventListener('dd:setvalue', (e) => {
    const d = (e as CustomEvent).detail as { value: string; emit?: boolean };
    commit(d.value ?? '', d.emit === true);
  });

  root.addEventListener('dd:setoptions', (e) => {
    const d = (e as CustomEvent).detail as { options: DDOption[]; value?: string; placeholder?: string; disabled?: boolean };
    const ph = d.placeholder ?? placeholder;

    list.replaceChildren(...d.options.map((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dd-option';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('data-dd-option', o.value);
      b.setAttribute('data-dd-text', o.label.toLowerCase());
      const t = document.createElement('span');
      t.textContent = o.label;
      const c = document.createElement('span');
      c.hidden = true;
      c.className = 'flex-none';
      c.setAttribute('data-dd-check', '');
      b.append(t, c);
      return b;
    }));

    native.replaceChildren(...[{ value: '', label: ph }, ...d.options].map((o) => {
      const el = document.createElement('option');
      el.value = o.value;
      el.textContent = o.label;
      return el;
    }));

    const disabled = d.disabled ?? d.options.length === 0;
    trigger.disabled = disabled;
    native.disabled = disabled;
    if (labelEl) labelEl.textContent = ph;

    const keep = d.value && d.options.some((o) => o.value === d.value) ? d.value : '';
    commit(keep, false);
    if (!keep && labelEl) labelEl.textContent = ph;
    if (search) { search.value = ''; filter(''); }
  });

  commit(root.getAttribute('data-value') || '', false);
}

/** Idempotent: safe to call from the component and from every page. */
export function initDropdowns(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-dd]').forEach((el) => {
    if (started.has(el)) return;
    started.add(el);
    initDropdown(el);
  });
}
