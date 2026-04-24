import { Innertube, Platform } from 'youtubei.js';

let clientPromise = null;
let evalPatched = false;

function ensureJsEvaluator() {
  if (evalPatched) {
    return;
  }
  Platform.shim.eval = async (data, env) => {
    const props = [];
    if (env && typeof env.n === 'string') {
      props.push(`n: exportedVars.nFunction(${JSON.stringify(env.n)})`);
    }
    if (env && typeof env.sig === 'string') {
      props.push(`sig: exportedVars.sigFunction(${JSON.stringify(env.sig)})`);
    }
    if (props.length === 0) {
      return {};
    }
    const code = `${data.output}\nreturn { ${props.join(', ')} };`;
    return Function(code)();
  };
  evalPatched = true;
}

/**
 * Uygulama genelinde tek bir Innertube örneği.
 * @returns {Promise<import('youtubei.js').default>}
 */
export function getInnertube() {
  if (!clientPromise) {
    ensureJsEvaluator();
    clientPromise = Innertube.create().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}
