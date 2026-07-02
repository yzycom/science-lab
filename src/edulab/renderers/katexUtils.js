import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

/**
 * 对 DOM 元素内的所有 $...$ / $$...$$ LaTeX 语法进行渲染。
 * 三个 Edulab 渲染器在通过 innerHTML 插入 step.content / step.html / lesson.problem 等字符串后，
 * 必须调用此函数做后处理，否则数学公式会以源码形式显示。
 *
 * @param {HTMLElement} container - 需要渲染 LaTeX 的容器元素
 */
export function renderLatex(container) {
  if (!container) return;
  
  try {
    renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
      errorColor: '#d97757',
      strict: false,
    });
  } catch (err) {
    console.warn('KaTeX rendering failed:', err);
  }
}
