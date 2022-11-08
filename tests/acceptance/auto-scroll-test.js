import { module, test } from 'qunit';
import { visit, find } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { drag } from 'ember-sortable/test-support/helpers';

module('Acceptance | container auto scroll', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    document.getElementById('ember-testing-container').scrollTop = 0;
    document.documentElement.scrollTop = 0;
  });

  test('verticaly reordering can scroll his parent container', async function (assert) {
    await visit('/docautoscroll');

    let itemHeight = () => {
      let item = find('[data-test-doc-auto-scroll-demo-item]');
      const itemStyle = item.currentStyle || window.getComputedStyle(item);
      return item.offsetHeight + parseInt(itemStyle.marginTop);
    };

    await drag('mouse', '[data-test-doc-auto-scroll-demo-item]', () => {
      return { dy: itemHeight() * 30 + 1, dx: undefined };
    });
    assert.ok(document.getElementById('ember-testing-container').scrollTop, 'The container has scroll (top)');
  });

  test('horizontaly reordering can scroll his parent container', async function (assert) {
    await visit('/docautoscroll?direction=x');

    let itemWidth = () => {
      let item = find('[data-test-doc-auto-scroll-demo-item]');
      const itemStyle = item.currentStyle || window.getComputedStyle(item);
      return item.offsetWidth + parseInt(itemStyle.marginLeft);
    };

    await drag('mouse', '[data-test-doc-auto-scroll-demo-item]', () => {
      return { dy: undefined, dx: itemWidth() * 30 + 1 };
    });
    assert.ok(document.getElementById('ember-testing-container').scrollLeft, 'The container has scroll (left)');
  });
});
