'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const math = require('../js/step26-scale-width-math.js');

test('distanciamento_cordas_nut = largura_braco_nut - 2 × margem', () => {
  const r = math.getNutStringSpacing(52, 3.5);
  assert.equal(r.ok, true);
  assert.equal(r.value, 45);
});

test('margem maior que metade do nut é inválida', () => {
  const r = math.getNutStringSpacing(52, 30);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'margin_too_large');
});

test('B(0) permanece igual à largura física do nut', () => {
  const geo = math.computeScaleGeometry(52, 3.5, 60, [0, 12, 14, 19]);
  assert.equal(geo.ok, true);
  assert.equal(math.roundMm(geo.atFret[0].scaleWidth, 2), 52);
  assert.equal(math.roundMm(geo.atFret[0].stringSpacing, 2), 45);
});

test('margem esquerda e direita iguais em todas as casas', () => {
  const geo = math.computeScaleGeometry(52, 3.5, 60, [0, 7, 12, 14, 19]);
  assert.equal(geo.ok, true);
  Object.keys(geo.atFret).forEach((fret) => {
    const item = geo.atFret[fret];
    assert.equal(item.leftMargin, 3.5);
    assert.equal(item.rightMargin, 3.5);
    assert.equal(math.roundMm(item.scaleWidth - item.stringSpacing, 2), 7);
  });
});

test('espaçamento das cordas aumenta progressivamente', () => {
  const geo = math.computeScaleGeometry(52, 3.5, 60, [0, 5, 12, 19]);
  const s0 = geo.atFret[0].stringSpacing;
  const s5 = geo.atFret[5].stringSpacing;
  const s12 = geo.atFret[12].stringSpacing;
  const s19 = geo.atFret[19].stringSpacing;
  assert.ok(s5 > s0);
  assert.ok(s12 > s5);
  assert.ok(s19 > s12);
});

test('exemplo de validação: casa 12 = 59.5 mm', () => {
  const geo = math.computeScaleGeometry(52, 3.5, 60, [12]);
  assert.equal(math.roundMm(geo.atFret[12].stringSpacing, 2), 52.5);
  assert.equal(math.roundMm(geo.atFret[12].scaleWidth, 2), 59.5);
});

test('exemplo de validação: casa 14 ≈ 60.32 mm', () => {
  const geo = math.computeScaleGeometry(52, 3.5, 60, [14]);
  assert.equal(math.roundMm(geo.atFret[14].scaleWidth, 2), 60.32);
});

test('exemplo de validação: casa 19 ≈ 61.99 mm', () => {
  const geo = math.computeScaleGeometry(52, 3.5, 60, [19]);
  assert.equal(math.roundMm(geo.atFret[19].scaleWidth, 2), 61.99);
});

test('alteração da largura do nut recalcula a escala', () => {
  const a = math.computeScaleGeometry(52, 3.5, 60, [12]);
  const b = math.computeScaleGeometry(54, 3.5, 60, [12]);
  assert.notEqual(
    math.roundMm(a.atFret[12].scaleWidth, 2),
    math.roundMm(b.atFret[12].scaleWidth, 2)
  );
});

test('alteração do distanciamento dos furos recalcula a escala', () => {
  const a = math.computeScaleGeometry(52, 3.5, 60, [12]);
  const b = math.computeScaleGeometry(52, 3.5, 55, [12]);
  assert.notEqual(
    math.roundMm(a.atFret[12].scaleWidth, 2),
    math.roundMm(b.atFret[12].scaleWidth, 2)
  );
});

test('alteração da margem recalcula a escala', () => {
  const a = math.computeScaleGeometry(52, 3.5, 60, [0, 12]);
  const b = math.computeScaleGeometry(52, 4.0, 60, [0, 12]);
  // Physical width at fret 0 stays equal to nut width.
  assert.equal(math.roundMm(a.atFret[0].scaleWidth, 2), 52);
  assert.equal(math.roundMm(b.atFret[0].scaleWidth, 2), 52);
  assert.notEqual(
    math.roundMm(a.atFret[12].scaleWidth, 2),
    math.roundMm(b.atFret[12].scaleWidth, 2)
  );
});

test('defaults por modelo estão centralizados e corretos', () => {
  assert.equal(math.getBridgeStringSpacing('violao_classico'), 60);
  assert.equal(math.getBridgeStringSpacing('violao_folk'), 55);
  assert.equal(math.getBridgeStringSpacing('violao_om'), 55);
  assert.equal(math.getBridgeStringSpacing('violao_jumbo'), 55);
  assert.equal(math.getBridgeStringSpacing('viola_caipira'), 56);
  assert.equal(math.getBridgeStringSpacing('cavaquinho_tradicional'), 23);
  assert.equal(math.getBridgeStringSpacing('ukulele_soprano'), 23);
  assert.equal(math.getBridgeStringSpacing('ukulele_concert'), 24);
  assert.equal(math.getBridgeStringSpacing('ukulele_tenor'), 27);
  assert.equal(math.getBridgeStringSpacing('ukulele_baritono'), 29);
  assert.equal(math.getBridgeStringSpacing('personalizado'), null);
  assert.equal(math.getBridgeStringSpacing(''), null);
  assert.equal(math.getScaleMargin('violao_classico'), 3.5);
});

test('distanciamento entre cordas no nut = (1ª↔última) ÷ (n−1)', () => {
  // 52 nut, 3.5 margin → 45 total; 6 strings → 5 gaps → 9 mm
  const adj = math.getAdjacentStringSpacing(45, 6);
  assert.equal(adj.ok, true);
  assert.equal(adj.gaps, 5);
  assert.equal(adj.value, 9);
  assert.equal(adj.mode, 'strings');

  const geo = math.computeScaleGeometry(52, 3.5, 60, [0, 12], 6);
  assert.equal(geo.ok, true);
  assert.equal(math.roundMm(geo.adjacentStringSpacingNut, 2), 9);
  assert.equal(math.roundMm(geo.atFret[0].adjacentStringSpacing, 2), 9);
});

test('viola 10 cordas: espaçamento por pares = total ÷ 4', () => {
  // 50 nut, 3.5 margin → 43 total; 10 cordas = 5 pares → 4 gaps → 43/4
  const adj = math.getAdjacentStringSpacing(43, 10, 'pairs');
  assert.equal(adj.ok, true);
  assert.equal(adj.mode, 'pairs');
  assert.equal(adj.pairCount, 5);
  assert.equal(adj.gaps, 4);
  assert.equal(adj.value, 43 / 4);

  const geo = math.computeScaleGeometry(50, 3.5, 56, [0], 10, { spacingMode: 'pairs' });
  assert.equal(geo.ok, true);
  assert.equal(geo.spacingMode, 'pairs');
  assert.equal(geo.pairCount, 5);
  assert.equal(math.roundMm(geo.adjacentStringSpacingNut, 2), math.roundMm(43 / 4, 2));
});

test('viola com nº ímpar de cordas é inválida no modo pares', () => {
  const adj = math.getAdjacentStringSpacing(43, 9, 'pairs');
  assert.equal(adj.ok, false);
  assert.equal(adj.error, 'odd_string_count_for_pairs');
});

test('nº de cordas < 2 é inválido para espaçamento adjacente', () => {
  const adj = math.getAdjacentStringSpacing(45, 1);
  assert.equal(adj.ok, false);
  assert.equal(adj.error, 'string_count_too_low');
});

test('B_final = distanciamento_furos + 2 × margem', () => {
  const geo = math.computeScaleGeometry(52, 3.5, 60, [1000], 6);
  assert.equal(math.roundMm(geo.atFret[1000].scaleWidth, 2), 67);
});
