import test from "ava";
import parseTorrent from 'parse-torrent';
import { leaves, alice } from 'webtorrent-fixtures';

import TorrentAgent from "../index.js";

const torrent = new TorrentAgent();

// https://github.com/webtorrent/webtorrent-fixtures/blob/master/index.js

test('webtorrent info /path/to/file.torrent', async t => {
  const parsedTorrent = {...leaves.parsedTorrent};
  delete parsedTorrent.info;
  delete parsedTorrent.infoBuffer;
  delete parsedTorrent.infoHashBuffer;

  t.deepEqual(
    await torrent.info(leaves.torrentPath), 
    parsedTorrent
  );
});

test('webtorrent info magnet_uri', async t => {
  const leavesMagnetURI = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub&tr=http%3A%2F%2Ftracker.example.com%2Fannounce&tr=http%3A%2F%2Ftracker.example2.com%2Fannounce&tr=udp%3A%2F%2Ftracker.example3.com%3A3310%2Fannounce&tr=udp%3A%2F%2Ftracker.example4.com%3A80&tr=udp%3A%2F%2Ftracker.example5.com%3A80&tr=udp%3A%2F%2Ftracker.example6.com%3A80';

  const parsedTorrent = parseTorrent(leavesMagnetURI);
  delete parsedTorrent.infoHashBuffer;

  t.deepEqual(
    await torrent.info(leavesMagnetURI), 
    parsedTorrent
  );
});

test('webtorrent create /path/to/file', t => {
  t.deepEqual(
    await (torrent.create(leaves.contentPath)).infoHash,
    'd2474e86c95b19b8bcfdb92bc12c9d44667cfa36'
  );
});

test('webtorrent download <torrent file> (with local content)', t => {
  t.deepEqual(
    alice.content,
    await torrent.download(alice.torrent)
  );
});

// TODO: re-enable flaky test once we make it work more reliably
test.skip('webtorrent downloadmeta <torrent-id>', t => {
  // sintel: 5.5 GB
  const expectedTorrent = fixtures.sintel.parsedTorrent;
  delete expectedTorrent.created;
  delete expectedTorrent.createdBy;
  t.deepEqual(
    await torrent.downloadmeta(fixtures.sintel.magnetURI),
    expectedTorrent
  );
});
