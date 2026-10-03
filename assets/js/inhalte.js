/* Veronika Martin – Inhalte aus data/*.json in die Seite schreiben.

   Die Texte pflegt Veronika im CMS (/admin/), gespeichert werden sie in
   data/*.json. Dieses Skript lädt die Dateien beim Seitenaufruf und schreibt
   sie in die markierten Elemente. Im HTML steht zusätzlich der Grundstand der
   Inhalte – den sehen Besucher ohne JavaScript und Crawler, die kein
   JavaScript ausführen.

   Markierungen im HTML:
     data-cms="pfad"              Textinhalt
     data-cms-inhalt="pfad"       content-Attribut (Meta-Tags)
     data-cms-link="mailto:pfad"  bzw. "tel:pfad" oder "anker:datei.html#pfad"
     data-cms-id="pfad"           id aus dem Wert erzeugen (Anker)
     data-cms-wenn="pfad"         Element entfernen, wenn der Wert leer ist
                                  (nur in Listenvorlagen verwenden)
     data-cms-klasse="name:pfad"  Klasse setzen, wenn der Wert wahr ist
     data-cms-bild="pfad"         Bildquelle (am <img>), dazu data-cms-alt
     data-cms-nr                  laufende Nummer in der Liste (01, 02 …)
     <template data-cms-liste="pfad">  Vorlage je Listeneintrag; Einträge
       werden direkt dahinter eingefügt oder mit data-cms-in="#id" in ein
       anderes Element. data-cms-filter="feld" bzw. "!feld" filtert.

   Pfade beziehen sich in Listen auf den Eintrag, sonst auf alle Daten;
   ein führender "/" erzwingt den Bezug auf alle Daten, "." ist der Eintrag. */
(function () {
  'use strict';

  var QUELLEN = ['allgemein', 'startseite', 'leistungen', 'referenzen', 'kontakt'];

  function slug(s) {
    return String(s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function telefonnummer(anzeige) {
    return String(anzeige).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  }

  function holen(bereich, daten, pfad) {
    if (pfad === '.') return bereich;
    var start = bereich;
    if (pfad.charAt(0) === '/') { start = daten; pfad = pfad.slice(1); }
    return pfad.split('.').reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, start);
  }

  function leer(wert) {
    return wert == null || wert === '' || wert === false ||
      (Array.isArray(wert) && wert.length === 0);
  }

  function nummer(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /* ---------- Inhalte ins HTML schreiben ---------- */

  function anwenden(el, bereich, daten, nr) {
    var a, wert;

    if ((a = el.getAttribute('data-cms-wenn')) !== null) {
      wert = holen(bereich, daten, a);
      if (leer(wert) && el.parentNode) { el.parentNode.removeChild(el); return; }
    }
    if ((a = el.getAttribute('data-cms')) !== null) {
      wert = holen(bereich, daten, a);
      if (wert !== undefined) el.textContent = wert == null ? '' : String(wert);
    }
    if ((a = el.getAttribute('data-cms-inhalt')) !== null) {
      wert = holen(bereich, daten, a);
      if (wert !== undefined) el.setAttribute('content', String(wert));
    }
    if ((a = el.getAttribute('data-cms-link')) !== null) {
      var art = a.slice(0, a.indexOf(':'));
      var rest = a.slice(a.indexOf(':') + 1);
      if (art === 'anker') {
        var teile = rest.split('#');
        wert = holen(bereich, daten, teile[1]);
        if (wert !== undefined) el.setAttribute('href', teile[0] + '#' + slug(wert));
      } else {
        wert = holen(bereich, daten, rest);
        if (wert !== undefined) {
          el.setAttribute('href', art + ':' + (art === 'tel' ? telefonnummer(wert) : String(wert).trim()));
        }
      }
    }
    if ((a = el.getAttribute('data-cms-id')) !== null) {
      wert = holen(bereich, daten, a);
      if (wert !== undefined) el.id = slug(wert);
    }
    if ((a = el.getAttribute('data-cms-klasse')) !== null) {
      var name = a.slice(0, a.indexOf(':'));
      wert = holen(bereich, daten, a.slice(a.indexOf(':') + 1));
      if (leer(wert)) el.classList.remove(name); else el.classList.add(name);
    }
    if ((a = el.getAttribute('data-cms-bild')) !== null) {
      wert = holen(bereich, daten, a);
      if (wert) bildSetzen(el, String(wert).replace(/^\//, ''));
    }
    if ((a = el.getAttribute('data-cms-alt')) !== null) {
      wert = holen(bereich, daten, a);
      if (wert !== undefined) el.setAttribute('alt', wert == null ? '' : String(wert));
    }
    if (el.hasAttribute('data-cms-nr') && nr) {
      el.textContent = nummer(nr);
    }
  }

  /* Solange das ursprüngliche Bild gewählt ist, bleiben die optimierten
     Varianten (WebP, zwei Größen) erhalten. Bei einem neuen Bild aus dem CMS
     gibt es nur die eine hochgeladene Datei. */
  function bildSetzen(img, quelle) {
    if (img.getAttribute('src') === quelle) return;
    img.setAttribute('src', quelle);
    ['srcset', 'sizes', 'width', 'height'].forEach(function (attr) { img.removeAttribute(attr); });
    var bild = img.parentNode;
    if (bild && bild.tagName === 'PICTURE') {
      Array.prototype.slice.call(bild.querySelectorAll('source')).forEach(function (s) {
        bild.removeChild(s);
      });
    }
  }

  function istLeerText(knoten) {
    return knoten.nodeType === 3 && !/\S/.test(knoten.nodeValue);
  }

  function liste(vorlage, bereich, daten) {
    var pfad = vorlage.getAttribute('data-cms-liste');
    var eintraege = holen(bereich, daten, pfad);
    if (!Array.isArray(eintraege)) return;

    var filter = vorlage.getAttribute('data-cms-filter') || '';
    var schluessel = pfad + '|' + filter;
    var dokument = vorlage.ownerDocument;
    var zielAngabe = vorlage.getAttribute('data-cms-in');
    var ziel = zielAngabe ? dokument.querySelector(zielAngabe) : null;

    // Bisherigen Stand (Grundstand im HTML) entfernen
    if (ziel) {
      Array.prototype.slice.call(ziel.childNodes).forEach(function (k) {
        if (istLeerText(k) || (k.nodeType === 1 && k.getAttribute('data-cms-eintrag') === schluessel)) {
          ziel.removeChild(k);
        }
      });
    } else {
      var k = vorlage.nextSibling;
      while (k && (istLeerText(k) || (k.nodeType === 1 && k.getAttribute('data-cms-eintrag') === schluessel))) {
        var weiter = k.nextSibling;
        k.parentNode.removeChild(k);
        k = weiter;
      }
    }

    var nachher = ziel ? null : vorlage.nextSibling;
    eintraege.forEach(function (eintrag, i) {
      if (filter) {
        var verneint = filter.charAt(0) === '!';
        var feldWert = eintrag && eintrag[verneint ? filter.slice(1) : filter];
        if (verneint ? !leer(feldWert) : leer(feldWert)) return;
      }
      var teil = vorlage.content.cloneNode(true);
      Array.prototype.slice.call(teil.childNodes).forEach(function (el) {
        if (el.nodeType !== 1) return;
        el.setAttribute('data-cms-eintrag', schluessel);
        anwenden(el, eintrag, daten, i + 1);
        binden(el, eintrag, daten, i + 1);
        // Leerzeichen zwischen den Einträgen wie im statischen HTML
        var abstand = dokument.createTextNode('\n');
        if (ziel) { ziel.appendChild(abstand); ziel.appendChild(el); }
        else { vorlage.parentNode.insertBefore(abstand, nachher); vorlage.parentNode.insertBefore(el, nachher); }
      });
    });
  }

  function binden(wurzel, bereich, daten, nr) {
    Array.prototype.slice.call(wurzel.children).forEach(function (el) {
      // Listeneinträge erzeugt ihre Vorlage, sie werden hier nicht angefasst
      if (el.hasAttribute('data-cms-eintrag')) return;
      if (el.tagName === 'TEMPLATE') {
        if (el.hasAttribute('data-cms-liste')) liste(el, bereich, daten);
        return;
      }
      anwenden(el, bereich, daten, nr);
      binden(el, bereich, daten, nr);
    });
  }

  /* ---------- Strukturierte Daten (schema.org) für Google ----------
     Google wertet auch per JavaScript eingefügtes JSON-LD aus. Im HTML steht
     der Grundstand für Crawler ohne JavaScript. */

  var BASIS = 'https://veronika-martin.de/';
  var EINSATZGEBIET = { '@type': 'Country', name: 'Deutschland' };

  function sportarten(d) {
    var namen = [];
    d.referenzen.veranstaltungen.eintraege.forEach(function (e) {
      var s = String(e.sportart).trim();
      if (/^[A-Za-zÄÖÜäöüß -]+$/.test(s) && s !== 'Diverse' && namen.indexOf(s) === -1) namen.push(s);
    });
    return namen;
  }

  function titelDerLeistungen(d) {
    return d.leistungen.leistungen.map(function (l) { return l.titel; });
  }

  function leistungenAlsService(d) {
    return d.leistungen.leistungen.map(function (l) {
      var umfang = l.umfang && l.umfang.length ? ' Umfang: ' + l.umfang.join(', ') + '.' : '';
      return {
        '@type': 'Service',
        '@id': BASIS + 'leistungen.html#' + slug(l.titel),
        name: l.titel,
        serviceType: l.titel,
        description: l.beschreibung + umfang,
        provider: { '@id': BASIS + '#business' },
        areaServed: EINSATZGEBIET
      };
    });
  }

  function unternehmen(d) {
    var a = d.allgemein;
    return {
      '@type': 'ProfessionalService',
      '@id': BASIS + '#business',
      name: 'Veronika Martin – Sport Event Management',
      alternateName: 'Veronika Martin – service in sports',
      description: a.kurzbeschreibung,
      url: BASIS,
      logo: BASIS + 'assets/img/logo-800.png',
      image: BASIS + 'assets/img/akkreditierungsausweise-1200.jpg',
      email: a.email,
      telephone: telefonnummer(a.telefon),
      slogan: d.startseite.hero.motto,
      foundingDate: '2011',
      areaServed: EINSATZGEBIET,
      address: {
        '@type': 'PostalAddress',
        streetAddress: a.strasse,
        postalCode: a.plz,
        addressLocality: a.ort,
        addressRegion: 'Bayern',
        addressCountry: 'DE'
      },
      founder: { '@id': BASIS + '#person' },
      knowsAbout: ['Sport Event Management'].concat(titelDerLeistungen(d), ['Projektleitung'], sportarten(d)),
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Leistungen',
        itemListElement: leistungenAlsService(d).map(function (s) { return { '@type': 'Offer', itemOffered: s }; })
      }
    };
  }

  function person(d, ausfuehrlich) {
    var p = {
      '@type': 'Person',
      '@id': BASIS + '#person',
      name: 'Veronika Martin',
      jobTitle: 'Sport Event Managerin',
      image: BASIS + String(d.startseite.ueberMich.bild).replace(/^\//, ''),
      url: BASIS + 'referenzen.html',
      worksFor: { '@id': BASIS + '#business' },
      knowsLanguage: ['Deutsch'].concat(d.referenzen.ausbildung.sprachen.map(function (s) { return s.sprache; })),
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'Westfälische Wilhelms-Universität Münster' }
    };
    if (ausfuehrlich) {
      p.description = d.referenzen.kopf.text;
      p.knowsAbout = titelDerLeistungen(d).concat(sportarten(d));
    }
    return p;
  }

  function brotkrumen(name, url) {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Start', item: BASIS },
        { '@type': 'ListItem', position: 2, name: name, item: url }
      ]
    };
  }

  var STRUKTUR = {
    'index.html': function (d) {
      return [
        { '@type': 'WebSite', '@id': BASIS + '#website', url: BASIS, name: 'Veronika Martin – Sport Event Management', inLanguage: 'de-DE', publisher: { '@id': BASIS + '#business' } },
        unternehmen(d),
        person(d, false)
      ];
    },
    'leistungen.html': function (d) {
      return [
        {
          '@type': 'WebPage', '@id': BASIS + 'leistungen.html', url: BASIS + 'leistungen.html',
          name: d.leistungen.seo.titel, inLanguage: 'de-DE',
          isPartOf: { '@id': BASIS + '#website' }, about: { '@id': BASIS + '#business' },
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: leistungenAlsService(d).map(function (s, i) { return { '@type': 'ListItem', position: i + 1, item: s }; })
          }
        },
        brotkrumen('Leistungen', BASIS + 'leistungen.html')
      ];
    },
    'referenzen.html': function (d) {
      return [
        {
          '@type': 'ProfilePage', '@id': BASIS + 'referenzen.html', url: BASIS + 'referenzen.html',
          name: d.referenzen.seo.titel, inLanguage: 'de-DE',
          isPartOf: { '@id': BASIS + '#website' }, mainEntity: person(d, true)
        },
        brotkrumen('Referenzen', BASIS + 'referenzen.html')
      ];
    },
    'kontakt.html': function (d) {
      var nummer = telefonnummer(d.allgemein.telefon);
      return [
        {
          '@type': 'ContactPage', '@id': BASIS + 'kontakt.html', url: BASIS + 'kontakt.html',
          name: d.kontakt.seo.titel, inLanguage: 'de-DE', isPartOf: { '@id': BASIS + '#website' },
          about: {
            '@type': 'ProfessionalService', '@id': BASIS + '#business',
            name: 'Veronika Martin – Sport Event Management',
            email: d.allgemein.email, telephone: nummer, areaServed: EINSATZGEBIET,
            contactPoint: {
              '@type': 'ContactPoint', contactType: 'Anfragen zu Sportveranstaltungen',
              email: d.allgemein.email, telephone: nummer, availableLanguage: ['de', 'en']
            }
          }
        },
        brotkrumen('Kontakt', BASIS + 'kontakt.html')
      ];
    }
  };

  function strukturdaten(dokument, daten) {
    var datei = (dokument.location && dokument.location.pathname.split('/').pop()) || '';
    if (datei && !/\.html$/.test(datei)) datei += '.html'; // GitHub Pages liefert auch /leistungen aus
    var erzeugen = STRUKTUR[datei || 'index.html'];
    var skript = dokument.querySelector('script[type="application/ld+json"]');
    if (!erzeugen || !skript) return;
    try {
      skript.textContent = '\n' + JSON.stringify({ '@context': 'https://schema.org', '@graph': erzeugen(daten) }, null, 2) + '\n';
    } catch (e) { /* unvollständige Daten – Grundstand im HTML bleibt */ }
  }

  /* ---------- Start ---------- */

  function rendern(dokument, daten) {
    binden(dokument.documentElement, daten, daten, 0);
    if (QUELLEN.every(function (n) { return daten[n]; })) strukturdaten(dokument, daten);
  }

  Promise.all(QUELLEN.map(function (name) {
    return fetch('data/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : undefined; });
  })).then(function (teile) {
    var daten = {};
    QUELLEN.forEach(function (name, i) { if (teile[i]) daten[name] = teile[i]; });
    rendern(document, daten);
  }).catch(function () { /* z. B. Datei direkt geöffnet – dann bleibt der Grundstand im HTML */ });
})();
