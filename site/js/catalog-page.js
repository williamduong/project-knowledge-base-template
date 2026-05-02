(function () {
  var body = document.body;
  var source = body && body.getAttribute('data-source');
  var mode = body && body.getAttribute('data-mode');
  var listEl = document.getElementById('catalogList');
  var searchEl = document.getElementById('catalogSearch');
  var countEl = document.getElementById('catalogCount');
  var updatedEl = document.getElementById('catalogUpdated');

  if (!source || !listEl) {
    return;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toFlatText(item) {
    if (!item || typeof item !== 'object') return '';
    return Object.values(item)
      .map(function (v) {
        if (Array.isArray(v)) return v.join(' ');
        return String(v);
      })
      .join(' ')
      .toLowerCase();
  }

  function statusChip(status) {
    var normalized = String(status || 'unknown').toLowerCase();
    return '<span class="chip chip-' + normalized + '">' + escapeHtml(status || 'unknown') + '</span>';
  }

  function renderFeature(item) {
    return [
      '<article class="card">',
      '  <header class="card-head">',
      '    <h3>' + escapeHtml(item.name || item.id || 'Unnamed feature') + '</h3>',
      '    ' + statusChip(item.status),
      '  </header>',
      '  <p class="meta"><strong>ID:</strong> ' + escapeHtml(item.id || '-') + ' <span class="dot">•</span> <strong>Scope:</strong> ' + escapeHtml(item.scope || '-') + '</p>',
      '  <p>' + escapeHtml(item.summary || '') + '</p>',
      '  <p class="refs"><strong>Refs:</strong> ' + escapeHtml((item.references || []).join(', ')) + '</p>',
      '</article>'
    ].join('\n');
  }

  function renderCommand(item) {
    return [
      '<article class="card">',
      '  <header class="card-head">',
      '    <h3><code>' + escapeHtml(item.command || '') + '</code></h3>',
      '    ' + statusChip(item.stability),
      '  </header>',
      '  <p class="meta"><strong>Group:</strong> ' + escapeHtml(item.group || '-') + '</p>',
      '  <p>' + escapeHtml(item.purpose || '') + '</p>',
      '</article>'
    ].join('\n');
  }

  function renderTestCase(item) {
    var steps = (item.steps || []).map(function (s) {
      return '<li>' + escapeHtml(s) + '</li>';
    }).join('');

    return [
      '<article class="card">',
      '  <header class="card-head">',
      '    <h3>' + escapeHtml(item.id || 'TC') + '</h3>',
      '    ' + statusChip(item.status),
      '  </header>',
      '  <p class="meta"><strong>Level:</strong> ' + escapeHtml(item.level || '-') + ' <span class="dot">•</span> <strong>Target:</strong> ' + escapeHtml(item.targetRepo || '-') + '</p>',
      '  <p><strong>Objective:</strong> ' + escapeHtml(item.objective || '') + '</p>',
      '  <div><strong>Steps:</strong><ol>' + steps + '</ol></div>',
      '  <p><strong>Expected:</strong> ' + escapeHtml(item.expected || '') + '</p>',
      '</article>'
    ].join('\n');
  }

  function renderItems(items) {
    if (!items || items.length === 0) {
      listEl.innerHTML = '<p class="empty">No items found.</p>';
      return;
    }

    var html = items.map(function (item) {
      if (mode === 'commands') return renderCommand(item);
      if (mode === 'tests') return renderTestCase(item);
      return renderFeature(item);
    }).join('\n');

    listEl.innerHTML = html;
  }

  fetch(source)
    .then(function (res) {
      if (!res.ok) throw new Error('Unable to load catalog: ' + source);
      return res.json();
    })
    .then(function (data) {
      var items = data.items || [];
      var query = '';

      if (updatedEl && data.updatedAt) {
        updatedEl.textContent = data.updatedAt;
      }

      function update() {
        var filtered = items.filter(function (item) {
          if (!query) return true;
          return toFlatText(item).indexOf(query) >= 0;
        });

        if (countEl) countEl.textContent = String(filtered.length);
        renderItems(filtered);
      }

      if (searchEl) {
        searchEl.addEventListener('input', function () {
          query = String(searchEl.value || '').trim().toLowerCase();
          update();
        });
      }

      update();
    })
    .catch(function (err) {
      listEl.innerHTML = '<p class="empty">' + escapeHtml(err.message) + '</p>';
    });
})();
