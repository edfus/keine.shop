type TorrentInput = string;

interface CreateTorrentOptions {
  /**
   * Basic.
   * 
   * name of the torrent
   * 
   * default = basename of `path`
   * or 1st file's name
   * or `Unnamed Torrent ${Date.now()}`
   */
  name: string,
  /**
   * Basic.
   * 
   * free-form textual comments of the author
   * 
   * default: ''
   */
  comment?: string,
  /**
   * Basic.
   * 
   * name and version of program used to create torrent
   * 
   * default: 'WebTorrent <https://webtorrent.io>'
   */
  createdBy?: string,
  /**
   * Basic.
   * 
   * creation time in UNIX epoch format
   * 
   * default = Date.now()
   */
  creationDate?: Date | number | string,
  /**
   * Basic.
   * 
   * remove hidden (starts with '.') and other junk files (like .DS_Store, desktop.ini)
   * 
   * default = true
   */
  filterJunkFiles?: boolean,
  /**
   * Basic.
   * 
   * is this a private .torrent?
   *
   * default = false
   */
  private?: boolean,
  /**
   * Advanced.
   * 
   * **force** a custom piece length (number of bytes)
   */
  pieceLength?: number,
  /**
   * Advanced.
   * 
   * custom trackers (array of arrays of strings)
   * (see [bep12](http://www.bittorrent.org/beps/bep_0012.html))
   */
  announceList?: Array<string []>,
  /**
   * Advanced.
   * 
   * web seed urls
   * (see [bep19](http://www.bittorrent.org/beps/bep_0019.html))
   */
  urlList?: string [],
  /**
   * Advanced.
   * 
   * add non-standard info dict entries.
   * e.g. info.source, a convention for cross-seeding 
   */
  info?: object
}

export declare class TorrentAgent {
  constructor(parameters);
  create(input: TorrentInput, options: CreateTorrentOptions): void;
  info(torrentId: TorrentInput): object;
  download(torrentId: TorrentInput): void;
  downloadMeta(torrentId: TorrentInput): void;
  seed(torrentId: null): void;
}