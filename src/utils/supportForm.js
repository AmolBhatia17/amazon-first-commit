/**
 * Support form submission.
 *
 * The Help and Contact forms used to POST to `/api/support`, which the backend
 * never implemented - every submission 404'd silently. They now go through
 * Web3Forms, the same service the bug-report modal already uses successfully.
 *
 * Set REACT_APP_WEB3FORMS_KEY to override the default access key.
 */
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export function getWeb3FormsKey() {
  return process.env.REACT_APP_WEB3FORMS_KEY || 'a932dd6c-756e-4564-a810-3088ac0b722b';
}

/**
 * @param {object} fields - Arbitrary form fields (type, subject, message, contact…).
 * @returns {Promise<{ok: boolean, message?: string}>} Never throws.
 */
export async function submitSupportRequest(fields) {
  const accessKey = getWeb3FormsKey();
  if (!accessKey) {
    return { ok: false, message: 'Missing Web3Forms key. Set REACT_APP_WEB3FORMS_KEY.' };
  }

  const payload = {
    access_key: accessKey,
    subject: fields.subject || 'UniTalks support request',
    from_name: 'UniTalks Support Form',
    ...fields,
    url: typeof window !== 'undefined' ? window.location.href : '',
  };

  if (fields.contact && /\S+@\S+\.\S+/.test(fields.contact)) {
    payload.replyto = fields.contact;
  }

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.success) {
      return { ok: true };
    }
    return { ok: false, message: (data && data.message) || 'Submission failed. Please try again.' };
  } catch (err) {
    return { ok: false, message: 'Network error. Please try again later.' };
  }
}
