/**
 * MATRIX INVERTIBILITY CHECKER MODULO N
 * Return true iff [[a,b],[c,d]] is invertible modulo n.
 * Works for any positive integer n (not necessarily prime).
 */
function isInvertibleModN(a, b, c, d, n) {
  if (!Number.isInteger(n) || n <= 1) return false;

  // Normalize into [0, n-1] to avoid surprises with negatives
  const mod = (x, m) => ((x % m) + m) % m;

  // determinant mod n
  const det = mod(a, n) * mod(d, n) - mod(b, n) * mod(c, n);
  const detMod = mod(det, n);

  // gcd(detMod, n) must be 1
  return gcd(detMod, n) === 1;
}

function gcd(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Map text to numeric codes for the Hill cipher.
 * 
 * @param {string} text - The input text to encode
 * @param {number} base - Either 26 (letters only) or 29 (letters + space + . + ?)
 * @returns {number[]|string} Array of numbers if valid base, otherwise an error message
 */
function textToNumbers(text, base) {
  if (base !== 26 && base !== 29) {
    return "Transformation base not supported — use 26 or 29.";
  }

  const result = [];

  for (const char of text) {
    // normalize to lowercase
    const ch = char.toLowerCase();

    if (/[a-z]/.test(ch)) {
      // 'a' → 0, 'b' → 1, ..., 'z' → 25
      result.push(ch.charCodeAt(0) - 97);
    } else if (base === 29) {
      // handle extra symbols
      if (ch === " ") result.push(26);
      else if (ch === ".") result.push(27);
      else if (ch === "?") result.push(28);
      // other symbols ignored
    }
    // symbols ignored automatically for base 26
  }

  return result;
}

/**
 * Convert an array of numbers back into text.
 * 
 * @param {number[]} arr - Array of numeric codes
 * @param {number} base - Either 26 (letters only) or 29 (letters + space + . + ?)
 * @returns {string} - The decoded text string
 */
function numbersToText(arr, base) {
  if (![26, 29].includes(base)) {
    return "Transformation base not supported — use 26 or 29.";
  }

  if (!Array.isArray(arr) || arr.length === 0) {
    return "";
  }

  let result = "";

  for (const num of arr) {
    if (base === 26) {
      // Only letters a–z
      if (Number.isInteger(num) && num >= 0 && num < 26) {
        result += String.fromCharCode(97 + num); // 0→'a', 25→'z'
      }
    } else if (base === 29) {
      // Letters + space + period + question mark
      if (num >= 0 && num <= 25) {
        result += String.fromCharCode(97 + num);
      } else if (num === 26) {
        result += " ";
      } else if (num === 27) {
        result += ".";
      } else if (num === 28) {
        result += "?";
      }
      // Other numbers ignored
    }
  }

  return result;
}

// --- Example usage ---
// console.log(numbersToText([7, 4, 11, 11, 14], 26));  // "hello"
// console.log(numbersToText([7, 4, 11, 11, 14, 26, 22, 14, 17, 11, 3, 27, 28], 29));
// "hello world.?"


/**
 * Encrypt a numeric message using a 2x2 Hill cipher key.
 *
 * @param {number[]} key - Array of 4 numbers [a, b, c, d]
 * @param {number[]} message - Array of message numbers (each 0..base-1)
 * @param {number} base - The modulus (26 or 29)
 * @returns {number[]|string} - Encrypted array, or error message if invalid
 */
function hillEncrypt(key, message, base) {
  if (!Array.isArray(key) || key.length !== 4) {
    return "Error: key must be an array of four integers [a,b,c,d].";
  }
  if (!Array.isArray(message) || message.length === 0) {
    return "Error: message must be a non-empty array of numbers.";
  }
  if (![26, 29].includes(base)) {
    return "Error: base must be 26 or 29.";
  }

  // Clone message and ensure even length (add "a" = 0 if odd)
  const msg = [...message];
  if (msg.length % 2 !== 0) {
    msg.push(0); // 'a' = 0
  }

  const [a, b, c, d] = key.map((x) => ((x % base) + base) % base);
  const encrypted = [];

  for (let i = 0; i < msg.length; i += 2) {
    const x1 = msg[i];
    const x2 = msg[i + 1];

    // Matrix multiplication mod base
    const y1 = (a * x1 + b * x2) % base;
    const y2 = (c * x1 + d * x2) % base;

    encrypted.push(y1, y2);
  }

  return encrypted;
}

// --- Example usage ---
// const key = [3, 3, 2, 5];          // typical Hill cipher key
// const message = [7, 4, 11, 11, 14]; // "HELLO"
// const base = 26;

// console.log(hillEncrypt(key, message, base));
// Example output: [17, 11, 0, 21, 12, 5] (the encrypted numeric array)


/**
 * Decrypt a numeric message using a 2x2 Hill cipher key.
 *
 * @param {number[]} key - Array of 4 numbers [a, b, c, d]
 * @param {number[]} cipher - Encrypted numeric array
 * @param {number} base - Modulus (26 or 29)
 * @returns {number[]|string} - Decrypted numeric array (with final 'a' removed if padding was added),
 *                              or error message if key not invertible.
 */
function hillDecrypt(key, cipher, base) {
  if (!Array.isArray(key) || key.length !== 4) {
    return "Error: key must be an array of four integers [a,b,c,d].";
  }
  if (!Array.isArray(cipher) || cipher.length === 0) {
    return "Error: cipher must be a non-empty array of numbers.";
  }
  if (![26, 29].includes(base)) {
    return "Error: base must be 26 or 29.";
  }

  // Normalize values mod base
  const mod = (x, m) => ((x % m) + m) % m;
  const [a, b, c, d] = key.map(k => mod(k, base));

  // Compute determinant and modular inverse
  const det = mod(a * d - b * c, base);
  const detInv = modInverse(det, base);
  if (detInv === null) {
    return "Error: key matrix is not invertible mod " + base;
  }

  // Construct inverse matrix mod base
  const invKey = [
    mod(detInv * d, base),
    mod(-detInv * b, base),
    mod(-detInv * c, base),
    mod(detInv * a, base)
  ];

  // If cipher length is odd, pad with a 0 ('a')
  const cipherPadded = [...cipher];
  let padded = false;
  if (cipherPadded.length % 2 !== 0) {
    cipherPadded.push(0);
    padded = true;
  }

  const decrypted = [];
  for (let i = 0; i < cipherPadded.length; i += 2) {
    const x1 = cipherPadded[i];
    const x2 = cipherPadded[i + 1];
    const y1 = mod(invKey[0] * x1 + invKey[1] * x2, base);
    const y2 = mod(invKey[2] * x1 + invKey[3] * x2, base);
    decrypted.push(y1, y2);
  }

  // If padding was added, remove the last 'a' (0)
  if (padded && decrypted[decrypted.length - 1] === 0) {
    decrypted.pop();
  }

  return decrypted;
}

/**
 * Compute modular inverse of a mod m.
 * Returns null if no inverse exists.
 */
function modInverse(a, m) {
  let [t, newT] = [0, 1];
  let [r, newR] = [m, ((a % m) + m) % m];

  while (newR !== 0) {
    const q = Math.floor(r / newR);
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }

  if (r > 1) return null; // no inverse
  if (t < 0) t += m;
  return t;
}

// --- Example usage ---
// const key = [3, 3, 2, 5];
// const cipher = [17, 11, 0, 21, 12, 5]; // Example encrypted message
// const base = 26;

// console.log(hillDecrypt(key, cipher, base));
// Should output something like [7, 4, 11, 11, 14] ("HELLO")

// ===== Flexible Input Utilities =====
function _onlyLetters(str) {
  return (str.match(/[a-z]/gi) || []).join("").toLowerCase();
}

function _parseCommaInts(str) {
  if (!str || !str.trim()) return [];
  return str.split(/[,\s;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(Number.isInteger);
}

function _validateRange(arr, base) {
  return arr.every(n => n >= 0 && n < base);
}

// Key: letters→nums and nums→letters (for display)
function parseKeyFlexible({ type, value, base }) {
  if (type === "letters") {
    const letters = _onlyLetters(value);
    if (letters.length !== 4) {
      return { error: "Key must be exactly 4 letters (a–z)." };
    }
    const nums = [...letters].map(ch => ch.charCodeAt(0) - 97);
    return { nums, letters };
  } else {
    const nums = _parseCommaInts(value);
    if (nums.length !== 4) {
      return { error: "Key must be exactly 4 integers: a,b,c,d." };
    }
    if (!_validateRange(nums, 26)) {
      // Key entries are matrix entries; they are used mod base at encryption time anyway.
      // We allow any integers; but for display-as-letters we clamp to 0..25.
    }
    const letters = nums.map(n => {
      const k = ((n % 26) + 26) % 26; // map to 0..25 to render a..z only
      return String.fromCharCode(97 + k);
    }).join("");
    return { nums, letters };
  }
}

// Message: text<->nums for chosen base
function parseMessageFlexible({ type, value, base }) {
  if (type === "text") {
    const nums = textToNumbers(value, base);
    if (!Array.isArray(nums) || nums.length === 0) {
      return { error: "Message has no encodable symbols for the chosen base." };
    }
    const text = numbersToText(nums, base); // normalized lowercase
    return { nums, text };
  } else {
    const nums = _parseCommaInts(value);
    if (nums.length === 0) return { error: "Please enter at least one number." };
    if (!_validateRange(nums, base)) return { error: `All numbers must be in 0…${base - 1}.` };
    const text = numbersToText(nums, base);
    return { nums, text };
  }
}

// ===== UI wiring =====
function _toggle(hiddenEl, show) {
  if (show) hiddenEl.classList.remove("hidden");
  else hiddenEl.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Encryption ----------
  const encForm = document.getElementById("encrypt-form");
  if (encForm) {
    const encOut = document.getElementById("enc-out");
    const encBase = document.getElementById("enc-base");

    const encKeyType = document.getElementById("enc-key-type");
    const encKeyLetters = document.getElementById("enc-key-letters");
    const encKeyNums = document.getElementById("enc-key-nums");

    const encMsgType = document.getElementById("enc-msg-type");
    const encMsgText = document.getElementById("enc-message-text");
    const encMsgNums = document.getElementById("enc-message-nums");

    const encClear = document.getElementById("enc-clear");

    // show/hide key inputs
    function syncEncKeyUI() {
      const t = encKeyType.value;
      _toggle(encKeyLetters, t === "letters");
      _toggle(encKeyNums, t === "numbers");
    }
    // show/hide message inputs
    function syncEncMsgUI() {
      const t = encMsgType.value;
      _toggle(encMsgText, t === "text");
      _toggle(encMsgNums, t === "numbers");
    }
    encKeyType.addEventListener("change", syncEncKeyUI);
    encMsgType.addEventListener("change", syncEncMsgUI);
    syncEncKeyUI();
    syncEncMsgUI();

    encForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const base = parseInt(encBase.value, 10);

      const keyParsed = parseKeyFlexible({
        type: encKeyType.value,
        value: encKeyType.value === "letters" ? encKeyLetters.value : encKeyNums.value,
        base
      });
      if (keyParsed.error) {
        encOut.innerHTML = `<span class="bad">${keyParsed.error}</span>`;
        return;
      }

      const msgParsed = parseMessageFlexible({
        type: encMsgType.value,
        value: encMsgType.value === "text" ? encMsgText.value : encMsgNums.value,
        base
      });
      if (msgParsed.error) {
        encOut.innerHTML = `<span class="bad">${msgParsed.error}</span>`;
        return;
      }

      // Encrypt (numbers only), then show both formats
      const cipherNums = hillEncrypt(keyParsed.nums, msgParsed.nums, base);
      if (!Array.isArray(cipherNums)) {
        encOut.innerHTML = `<span class="bad">${cipherNums}</span>`;
        return;
      }
      const cipherText = numbersToText(cipherNums, base);

      // Optional: warn if key not invertible (encryption still works)
      const [a,b,c,d] = keyParsed.nums;
      let warn = "";
      if (typeof isInvertibleModN === "function" && !isInvertibleModN(a,b,c,d,base)) {
        warn = `<br><span class="bad">Warning: key is NOT invertible mod ${base} — decryption won’t be possible.</span>`;
      }

      encOut.innerHTML = `
        <strong>Key (letters):</strong> ${keyParsed.letters}<br>
        <strong>Key (numbers):</strong> ${keyParsed.nums.join(", ")}<br><br>
        <strong>Ciphertext (text):</strong> ${cipherText}<br>
        <strong>Ciphertext (numbers):</strong> ${cipherNums.join(", ")}
        ${warn}
      `;
    });

    encClear.addEventListener("click", () => {
      encKeyType.value = "letters";
      encMsgType.value = "text";
      encKeyLetters.value = "";
      encKeyNums.value = "";
      encMsgText.value = "";
      encMsgNums.value = "";
      syncEncKeyUI();
      syncEncMsgUI();
      encOut.textContent = "Enter key & message (text or numbers), pick a base, then Encrypt.";
    });
  }

  // ---------- Decryption ----------
  const decForm = document.getElementById("decrypt-form");
  if (decForm) {
    const decOut = document.getElementById("dec-out");
    const decBase = document.getElementById("dec-base");

    const decKeyType = document.getElementById("dec-key-type");
    const decKeyLetters = document.getElementById("dec-key-letters");
    const decKeyNums = document.getElementById("dec-key-nums");

    const decMsgType = document.getElementById("dec-msg-type");
    const decCipherText = document.getElementById("dec-cipher-text");
    const decCipherNums = document.getElementById("dec-cipher-nums");

    const decClear = document.getElementById("dec-clear");

    function syncDecKeyUI() {
      const t = decKeyType.value;
      _toggle(decKeyLetters, t === "letters");
      _toggle(decKeyNums, t === "numbers");
    }
    function syncDecMsgUI() {
      const t = decMsgType.value;
      _toggle(decCipherText, t === "text");
      _toggle(decCipherNums, t === "numbers");
    }
    decKeyType.addEventListener("change", syncDecKeyUI);
    decMsgType.addEventListener("change", syncDecMsgUI);
    syncDecKeyUI();
    syncDecMsgUI();

    decForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const base = parseInt(decBase.value, 10);

      const keyParsed = parseKeyFlexible({
        type: decKeyType.value,
        value: decKeyType.value === "letters" ? decKeyLetters.value : decKeyNums.value,
        base
      });
      if (keyParsed.error) {
        decOut.innerHTML = `<span class="bad">${keyParsed.error}</span>`;
        return;
      }

      // Check key invertibility first (required for decryption)
      const [a,b,c,d] = keyParsed.nums;
      if (typeof isInvertibleModN !== "function" || !isInvertibleModN(a,b,c,d,base)) {
        decOut.innerHTML = `<span class="bad">Key matrix is NOT invertible mod ${base}. Not a valid key.</span>`;
        return;
      }

      const msgParsed = parseMessageFlexible({
        type: decMsgType.value,
        value: decMsgType.value === "text" ? decCipherText.value : decCipherNums.value,
        base
      });
      if (msgParsed.error) {
        decOut.innerHTML = `<span class="bad">${msgParsed.error}</span>`;
        return;
      }

      const plainNums = hillDecrypt(keyParsed.nums, msgParsed.nums, base);
      if (!Array.isArray(plainNums)) {
        decOut.innerHTML = `<span class="bad">${plainNums}</span>`;
        return;
      }
      const plainText = numbersToText(plainNums, base);

      decOut.innerHTML = `
        <strong>Key (letters):</strong> ${keyParsed.letters}<br>
        <strong>Key (numbers):</strong> ${keyParsed.nums.join(", ")}<br><br>
        <strong>Plaintext (text):</strong> ${plainText}<br>
        <strong>Plaintext (numbers):</strong> ${plainNums.join(", ")}
      `;
    });

    decClear.addEventListener("click", () => {
      decKeyType.value = "letters";
      decMsgType.value = "text";
      decKeyLetters.value = "";
      decKeyNums.value = "";
      decCipherText.value = "";
      decCipherNums.value = "";
      syncDecKeyUI();
      syncDecMsgUI();
      decOut.textContent = "Enter key & ciphertext (text or numbers), pick a base, then Decrypt.";
    });
  }
});
