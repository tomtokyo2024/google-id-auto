/**
 * dom-utils.js — DOM helper utilities shared by all content scripts.
 *
 * SOURCE:  Extracted from TMC-order-auto/chrome-extension/content.js
 * STATUS:  Reuse candidate. Compatibility with this project's target pages
 *          (actionscenter.google.com, admin.takeme.com) must be verified
 *          during Step ② DOM testing before business logic is written.
 *          See docs/dom-notes.md §开发约束 and §步骤② for validation notes.
 *
 * FUNCTIONS:
 *   wait(ms)
 *   waitForElement(selector, timeout?)
 *   waitForElementEnabled(selector, timeout?)
 *   setAngularValue(el, value)
 *   fillNgSelect(inputEl, searchText, matchText?)
 */

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(id);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(id);
        reject(new Error('Timeout waiting for: ' + selector));
      }
    }, 200);
  });
}

function waitForElementEnabled(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(() => {
      const el = document.querySelector(selector);
      if (el && !el.disabled) {
        clearInterval(id);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(id);
        reject(new Error('Timeout waiting for enabled: ' + selector));
      }
    }, 200);
  });
}

function setAngularValue(el, value) {
  if (el.tagName === 'TEXTAREA') {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (setter) setter.set.call(el, value);
    else el.value = value;
  } else {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (setter) setter.set.call(el, value);
    else el.value = value;
  }
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

async function fillNgSelect(inputEl, searchText, matchText) {
  const match = matchText || searchText;

  inputEl.click();
  await wait(300);
  setAngularValue(inputEl, searchText);
  await wait(1200);

  let option = Array.from(document.querySelectorAll('ngb-typeahead-window button'))
    .find(b => b.textContent.trim().includes(match));

  if (!option) {
    option = Array.from(document.querySelectorAll('div.ng-option, span.ng-option-label'))
      .find(el => el.textContent.trim().includes(match));
  }

  if (!option) throw new Error('Dropdown option not found for: ' + match);
  option.click();
  await wait(600);
}
