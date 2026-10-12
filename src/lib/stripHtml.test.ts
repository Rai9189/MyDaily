import { describe, it, expect } from 'vitest';
import { htmlToPreviewText } from './stripHtml';

describe('htmlToPreviewText', () => {
  it('puts each paragraph and <br> on its own line', () => {
    expect(htmlToPreviewText('<p>1</p><p>2</p><p>3</p>')).toBe('1\n2\n3');
    expect(htmlToPreviewText('<p>a<br>b</p>')).toBe('a\nb');
  });

  it('treats raw newlines in the HTML source as spaces', () => {
    expect(htmlToPreviewText('<p>Do Your Best And Regret\n- 27</p>')).toBe('Do Your Best And Regret - 27');
    expect(htmlToPreviewText('<p>  hello&nbsp;  world </p><p></p><p> next</p>')).toBe('hello world\nnext');
  });

  it('keeps bullet, numbered and checklist markers', () => {
    expect(htmlToPreviewText('<ul><li><p>Beras</p></li><li><p>Minyak</p></li></ul>')).toBe('• Beras\n• Minyak');
    expect(htmlToPreviewText('<ol start="3"><li><p>Bayar kos</p></li><li><p>Listrik</p></li></ol>')).toBe('3. Bayar kos\n4. Listrik');
    expect(htmlToPreviewText(
      '<ul data-type="taskList">' +
        '<li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Cuci baju</p></div></li>' +
        '<li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Setrika</p></div></li>' +
      '</ul>',
    )).toBe('☑ Cuci baju\n☐ Setrika');
  });

  it('indents nested lists and text around them', () => {
    expect(htmlToPreviewText(
      '<p>Belanja</p><ul><li><p>Dapur</p><ol><li><p>Beras</p></li></ol></li><li><p>Kamar</p></li></ul><p>Done</p>',
    )).toBe('Belanja\n• Dapur\n  1. Beras\n• Kamar\nDone');
  });
});
