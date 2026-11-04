(() => {
  'use strict';
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const fields = [...form.querySelectorAll('input[required], textarea[required]')];
  const services = [...form.querySelectorAll('input[name="Serviços[]"]')];
  const serviceGroup = form.querySelector('.contact-services');
  const servicesError = form.querySelector('#services-error');
  const button = form.querySelector('[type="submit"]');
  const label = form.querySelector('[data-submit-label]');
  const status = form.querySelector('.contact-form-status');
  let pending = false;
  let submitted = false;

  // Leave HTML validation and the reference's normal POST available without JS.
  form.noValidate = true;
  const setStatus = (message, state = '') => {
    status.textContent = message;
    status.className = `contact-form-status${state ? ` is-${state}` : ''}`;
  };
  const validateField = field => {
    let message = '';
    if (!field.value.trim()) message = 'Preencha este campo.';
    else if (field.type === 'email' && (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()))) message = 'Informe um e-mail válido, como nome@empresa.com.';
    else if (field.maxLength > 0 && field.value.length > field.maxLength) message = `Use até ${field.maxLength} caracteres.`;
    const error = form.querySelector(`#${field.id}-error`);
    error.textContent = message;
    error.hidden = !message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  };
  const validateServices = () => {
    const valid = services.some(input => input.checked);
    serviceGroup.classList.toggle('has-error', !valid);
    servicesError.hidden = valid;
    if (valid) serviceGroup.removeAttribute('aria-invalid');
    else serviceGroup.setAttribute('aria-invalid', 'true');
    return valid;
  };
  fields.forEach(field => {
    field.addEventListener('blur', () => { if (field.value || submitted) validateField(field); });
    field.addEventListener('input', () => {
      if (submitted || field.hasAttribute('aria-invalid')) validateField(field);
      if (!pending) setStatus('');
    });
  });
  services.forEach(input => input.addEventListener('change', () => {
    if (submitted) validateServices();
    if (!pending) setStatus('');
  }));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    submitted = true;
    setStatus('');
    const invalid = fields.filter(field => !validateField(field));
    const servicesValid = validateServices();
    if (invalid.length || !servicesValid) {
      setStatus('Revise os campos indicados antes de enviar.', 'error');
      (invalid[0] || services[0]).focus();
      return;
    }
    // Reject honeypot submissions locally as well as through FormSubmit's _honey.
    if (form.elements.namedItem('_honey').value) {
      setStatus('Não foi possível validar o envio. Recarregue a página e tente novamente.', 'error');
      return;
    }

    let endpoint;
    try {
      const action = new URL(form.action);
      if (action.protocol !== 'https:' || action.hostname !== 'formsubmit.co' || !action.pathname.slice(1)) throw new Error('Invalid endpoint');
      endpoint = `https://formsubmit.co/ajax/${action.pathname.replace(/^\/(?:ajax\/)?/, '')}`;
    } catch {
      setStatus('O contato está temporariamente indisponível. Tente novamente mais tarde.', 'error');
      return;
    }
    const formData = new FormData(form);
    fields.forEach(field => formData.set(field.name, field.value.trim()));
    formData.delete('Serviços[]');
    formData.set('Serviços desejados', services.filter(input => input.checked).map(input => input.value).join(', '));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    pending = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    label.textContent = 'Enviando...';
    setStatus('Enviando seu projeto...');
    // Lock the submitted snapshot so a slow response cannot erase subsequent edits.
    const controls = [...form.querySelectorAll('input:not([type="hidden"]), textarea')];
    controls.forEach(control => { control.disabled = true; });

    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: formData, signal: controller.signal });
      const result = await response.json();
      // A 200 response or unrecognized body alone never means the message was sent.
      if (!response.ok || ![true, 'true'].includes(result?.success)) throw new Error('Unconfirmed submission');
      if (/activat|ativa[çc][ãa]o|confirm (?:your|the) email/i.test(String(result.message || ''))) {
        setStatus('O canal de contato ainda está em ativação. Tente novamente mais tarde.', 'error');
        return;
      }
      form.reset();
      submitted = false;
      setStatus('Mensagem enviada. Obrigado pelo contato!', 'success');
    } catch {
      setStatus('Não foi possível confirmar o envio. Seus dados foram mantidos; tente novamente em instantes.', 'error');
    } finally {
      window.clearTimeout(timeout);
      controls.forEach(control => { control.disabled = false; });
      pending = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
      label.textContent = 'Enviar projeto';
    }
  });
})();
