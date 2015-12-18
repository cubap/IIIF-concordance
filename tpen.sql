# Host: localhost  (Version: 5.6.17)
# Date: 2015-04-24 14:07:12
# Generator: MySQL-Front 5.3  (Build 4.120)

/*!40101 SET NAMES utf8 */;

#
# Structure for table "admins"
#

DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `uid` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

#
# Structure for table "annotation"
#

DROP TABLE IF EXISTS `annotation`;
CREATE TABLE `annotation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `x` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `h` int(11) NOT NULL,
  `w` int(11) NOT NULL,
  `folio` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  `text` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=19 DEFAULT CHARSET=latin1;

#
# Structure for table "archivedannotation"
#

DROP TABLE IF EXISTS `archivedannotation`;
CREATE TABLE `archivedannotation` (
  `archivedID` int(11) NOT NULL AUTO_INCREMENT,
  `id` int(11) NOT NULL,
  `x` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `h` int(11) NOT NULL,
  `w` int(11) NOT NULL,
  `folio` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  `text` text NOT NULL,
  PRIMARY KEY (`archivedID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "archivedtranscription"
#

DROP TABLE IF EXISTS `archivedtranscription`;
CREATE TABLE `archivedtranscription` (
  `folio` int(11) NOT NULL,
  `line` int(11) NOT NULL,
  `comment` text NOT NULL,
  `text` mediumtext NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `creator` int(11) NOT NULL,
  `projectID` int(11) NOT NULL DEFAULT '0',
  `id` int(11) NOT NULL,
  `x` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `width` int(11) NOT NULL,
  `height` int(11) NOT NULL,
  `uniqueID` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`uniqueID`),
  KEY `folio` (`folio`),
  KEY `line` (`line`),
  KEY `creator` (`creator`)
) ENGINE=MyISAM AUTO_INCREMENT=810021 DEFAULT CHARSET=utf8;

#
# Structure for table "archives"
#

DROP TABLE IF EXISTS `archives`;
CREATE TABLE `archives` (
  `name` varchar(512) NOT NULL,
  `baseImageUrl` varchar(512) NOT NULL,
  `citation` varchar(512) NOT NULL,
  `eula` text NOT NULL,
  `message` text,
  `cookieURL` text,
  `uname` text,
  `pass` text,
  `local` tinyint(1) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "badfols"
#

DROP TABLE IF EXISTS `badfols`;
CREATE TABLE `badfols` (
  `pageNumber` int(11) DEFAULT NULL,
  `cnt` int(11) DEFAULT NULL,
  KEY `a` (`pageNumber`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "biblio"
#

DROP TABLE IF EXISTS `biblio`;
CREATE TABLE `biblio` (
  `author` varchar(512) NOT NULL,
  `titleM` mediumtext NOT NULL,
  `titleA` mediumtext NOT NULL,
  `title` mediumtext NOT NULL,
  `vol` varchar(512) NOT NULL,
  `date` varchar(512) NOT NULL,
  `pagination` varchar(512) NOT NULL,
  `pubplace` varchar(512) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subtitle` mediumtext NOT NULL,
  `series` mediumtext NOT NULL,
  `type` tinyint(4) NOT NULL,
  `editor` varchar(512) NOT NULL,
  `publisher` varchar(512) NOT NULL,
  `multivol` varchar(512) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `author` (`author`(333))
) ENGINE=MyISAM AUTO_INCREMENT=414 DEFAULT CHARSET=utf8;

#
# Structure for table "bibliorefs"
#

DROP TABLE IF EXISTS `bibliorefs`;
CREATE TABLE `bibliorefs` (
  `tract` varchar(255) NOT NULL,
  `page` varchar(255) NOT NULL,
  `id` varchar(255) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "blobmatches"
#

DROP TABLE IF EXISTS `blobmatches`;
CREATE TABLE `blobmatches` (
  `img1` varchar(255) NOT NULL,
  `blob1` varchar(255) NOT NULL,
  `img2` varchar(255) NOT NULL,
  `blob2` varchar(255) NOT NULL,
  KEY `img1` (`img1`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "blobs"
#

DROP TABLE IF EXISTS `blobs`;
CREATE TABLE `blobs` (
  `img` varchar(256) NOT NULL,
  `blob` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `x` int(11) NOT NULL,
  `h` int(11) NOT NULL,
  `w` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "buttons"
#

DROP TABLE IF EXISTS `buttons`;
CREATE TABLE `buttons` (
  `uid` int(11) NOT NULL,
  `position` int(11) NOT NULL,
  `text` varchar(256) NOT NULL,
  `param1` varchar(512) NOT NULL DEFAULT '',
  `param2` varchar(512) NOT NULL DEFAULT '',
  `param3` varchar(512) NOT NULL DEFAULT '',
  `param4` varchar(512) NOT NULL DEFAULT '',
  `param5` varchar(512) NOT NULL DEFAULT '',
  `description` varchar(512) NOT NULL DEFAULT '',
  `color` varchar(255) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "capelli"
#

DROP TABLE IF EXISTS `capelli`;
CREATE TABLE `capelli` (
  `image` varchar(512) NOT NULL,
  `label` varchar(512) NOT NULL DEFAULT 'none',
  `group` varchar(256) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `collection` varchar(512) NOT NULL DEFAULT 'capelli',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=811 DEFAULT CHARSET=utf8;

#
# Structure for table "charactercount"
#

DROP TABLE IF EXISTS `charactercount`;
CREATE TABLE `charactercount` (
  `count` int(11) NOT NULL,
  `img` varchar(256) NOT NULL,
  `blob` int(11) NOT NULL,
  `MS` varchar(128) NOT NULL,
  KEY `blob` (`blob`),
  KEY `img` (`img`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "citymap"
#

DROP TABLE IF EXISTS `citymap`;
CREATE TABLE `citymap` (
  `city` text NOT NULL,
  `value` text NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "comments"
#

DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `security` int(11) NOT NULL,
  `owner` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `text` text NOT NULL,
  `shortText` varchar(255) NOT NULL,
  `tract` varchar(255) NOT NULL,
  `updated` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  `paragraph` varchar(255) NOT NULL,
  `grp` int(11) NOT NULL,
  `response` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=54 DEFAULT CHARSET=latin1;

#
# Structure for table "foliomap"
#

DROP TABLE IF EXISTS `foliomap`;
CREATE TABLE `foliomap` (
  `folio` int(11) NOT NULL,
  `msPage` int(11) NOT NULL,
  PRIMARY KEY (`folio`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "folios"
#

DROP TABLE IF EXISTS `folios`;
CREATE TABLE `folios` (
  `pageNumber` int(11) NOT NULL AUTO_INCREMENT,
  `uri` text NOT NULL,
  `collection` varchar(512) NOT NULL,
  `pageName` varchar(512) NOT NULL,
  `imageName` varchar(512) NOT NULL,
  `archive` varchar(512) NOT NULL,
  `force` int(11) NOT NULL DEFAULT '1',
  `msID` int(11) NOT NULL,
  `sequence` int(11) DEFAULT '0',
  `canvas` varchar(512) DEFAULT '',
  `paleography` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `pageNumber` (`pageNumber`),
  KEY `coll` (`collection`(333)),
  KEY `imageName` (`imageName`(333)),
  KEY `archive` (`archive`(333)),
  KEY `msID` (`msID`),
  KEY `pagename` (`pageName`(333))
) ENGINE=MyISAM AUTO_INCREMENT=13192621 DEFAULT CHARSET=utf8;

#
# Structure for table "groupmembers"
#

DROP TABLE IF EXISTS `groupmembers`;
CREATE TABLE `groupmembers` (
  `UID` int(11) NOT NULL,
  `GID` int(11) NOT NULL,
  `role` varchar(256) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "groups"
#

DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups` (
  `name` varchar(512) NOT NULL,
  `GID` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`GID`)
) ENGINE=MyISAM AUTO_INCREMENT=2577 DEFAULT CHARSET=utf8;

#
# Structure for table "hotkeys"
#

DROP TABLE IF EXISTS `hotkeys`;
CREATE TABLE `hotkeys` (
  `key` int(11) NOT NULL,
  `position` int(11) NOT NULL,
  `uid` int(11) NOT NULL,
  `projectID` int(11) NOT NULL DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "image"
#

DROP TABLE IF EXISTS `image`;
CREATE TABLE `image` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `uploader` int(11) DEFAULT '0' COMMENT 'the userID who uploaded the image',
  `project` varchar(255) DEFAULT NULL COMMENT 'project image belongs to',
  `path` varchar(255) NOT NULL DEFAULT '' COMMENT 'the place where image stored on server',
  `size` bigint(20) DEFAULT NULL COMMENT 'size of uploaded file (image)',
  `upload_date` datetime DEFAULT NULL,
  `permission` int(2) NOT NULL DEFAULT '0' COMMENT '0: privaet, 1: public',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

#
# Structure for table "imagecache"
#

DROP TABLE IF EXISTS `imagecache`;
CREATE TABLE `imagecache` (
  `folio` int(11) NOT NULL,
  `image` longblob NOT NULL,
  `age` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `count` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fol` (`folio`)
) ENGINE=MyISAM AUTO_INCREMENT=24308 DEFAULT CHARSET=latin1;

#
# Structure for table "imagepositions"
#

DROP TABLE IF EXISTS `imagepositions`;
CREATE TABLE `imagepositions` (
  `folio` int(11) NOT NULL,
  `line` int(11) NOT NULL,
  `bottom` int(11) NOT NULL,
  `top` int(11) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `colstart` int(11) NOT NULL,
  `width` int(11) NOT NULL,
  `dummy` int(11) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`id`),
  KEY `folio` (`folio`)
) ENGINE=MyISAM AUTO_INCREMENT=701173 DEFAULT CHARSET=utf8;

#
# Structure for table "imagerequest"
#

DROP TABLE IF EXISTS `imagerequest`;
CREATE TABLE `imagerequest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `elapsedTime` int(11) NOT NULL,
  `UID` int(11) NOT NULL,
  `folio` int(11) NOT NULL,
  `cacheHit` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `succeeded` int(11) NOT NULL,
  `msg` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=109261 DEFAULT CHARSET=latin1;

#
# Structure for table "imgtmp"
#

DROP TABLE IF EXISTS `imgtmp`;
CREATE TABLE `imgtmp` (
  `img` varchar(512) COLLATE utf8_bin NOT NULL,
  `page` varchar(512) COLLATE utf8_bin NOT NULL,
  KEY `image` (`img`(333)),
  KEY `page` (`page`(333))
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

#
# Structure for table "ipr"
#

DROP TABLE IF EXISTS `ipr`;
CREATE TABLE `ipr` (
  `uid` int(11) NOT NULL,
  `archive` varchar(512) NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "linebreakingtext"
#

DROP TABLE IF EXISTS `linebreakingtext`;
CREATE TABLE `linebreakingtext` (
  `projectID` int(11) NOT NULL,
  `remainingText` longtext NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "manuscript"
#

DROP TABLE IF EXISTS `manuscript`;
CREATE TABLE `manuscript` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `city` varchar(512) NOT NULL,
  `archive` varchar(512) NOT NULL,
  `repository` varchar(512) NOT NULL,
  `msIdentifier` varchar(512) NOT NULL,
  `restricted` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `city` (`city`(333)),
  KEY `msIdentifier` (`msIdentifier`(333))
) ENGINE=MyISAM AUTO_INCREMENT=21774 DEFAULT CHARSET=utf8;

#
# Structure for table "manuscriptpermissions"
#

DROP TABLE IF EXISTS `manuscriptpermissions`;
CREATE TABLE `manuscriptpermissions` (
  `msID` int(11) NOT NULL,
  `uid` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "metadata"
#

DROP TABLE IF EXISTS `metadata`;
CREATE TABLE `metadata` (
  `title` text NOT NULL,
  `subject` text NOT NULL,
  `language` text NOT NULL,
  `author` text NOT NULL,
  `date` text NOT NULL,
  `location` text NOT NULL,
  `description` text NOT NULL,
  `subtitle` text NOT NULL,
  `msIdentifier` text NOT NULL,
  `msSettlement` text NOT NULL,
  `msIdNumber` text NOT NULL,
  `msRepository` text NOT NULL,
  `msCollection` text NOT NULL,
  `projectID` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "oldfimagepositions"
#

DROP TABLE IF EXISTS `oldfimagepositions`;
CREATE TABLE `oldfimagepositions` (
  `folio` int(11) NOT NULL,
  `line` int(11) NOT NULL,
  `bottom` int(11) NOT NULL,
  `top` int(11) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `colstart` int(11) NOT NULL,
  `width` int(11) NOT NULL,
  `dummy` int(11) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`id`),
  KEY `folio` (`folio`)
) ENGINE=MyISAM AUTO_INCREMENT=195072 DEFAULT CHARSET=utf8;

#
# Structure for table "paragraphs"
#

DROP TABLE IF EXISTS `paragraphs`;
CREATE TABLE `paragraphs` (
  `tract` varchar(512) NOT NULL,
  `sentences` int(12) NOT NULL,
  `words` int(12) NOT NULL,
  `characters` int(12) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "partnerproject"
#

DROP TABLE IF EXISTS `partnerproject`;
CREATE TABLE `partnerproject` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  `name` varchar(512) NOT NULL,
  `description` text NOT NULL,
  `url` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

#
# Structure for table "project"
#

DROP TABLE IF EXISTS `project`;
CREATE TABLE `project` (
  `grp` int(11) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(512) NOT NULL,
  `schemaURL` text NOT NULL,
  `linebreakCharacterLimit` int(11) NOT NULL DEFAULT '7500',
  `linebreakSymbol` varchar(256) NOT NULL DEFAULT '-',
  `imageBounding` varchar(255) NOT NULL DEFAULT 'lines',
  `partner` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=4352 DEFAULT CHARSET=utf8;

#
# Structure for table "projectbuttons"
#

DROP TABLE IF EXISTS `projectbuttons`;
CREATE TABLE `projectbuttons` (
  `project` int(11) NOT NULL,
  `position` int(11) NOT NULL,
  `text` varchar(256) NOT NULL,
  `param1` varchar(512) NOT NULL DEFAULT '',
  `param2` varchar(512) NOT NULL DEFAULT '',
  `param3` varchar(512) NOT NULL DEFAULT '',
  `param4` varchar(512) NOT NULL DEFAULT '',
  `param5` varchar(512) NOT NULL DEFAULT '',
  `description` text NOT NULL,
  `color` varchar(255) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "projectfolios"
#

DROP TABLE IF EXISTS `projectfolios`;
CREATE TABLE `projectfolios` (
  `position` int(11) NOT NULL,
  `project` int(11) NOT NULL,
  `folio` int(11) NOT NULL,
  KEY `proj` (`project`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "projectheader"
#

DROP TABLE IF EXISTS `projectheader`;
CREATE TABLE `projectheader` (
  `projectID` int(11) NOT NULL,
  `header` text NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "projectimagepositions"
#

DROP TABLE IF EXISTS `projectimagepositions`;
CREATE TABLE `projectimagepositions` (
  `folio` int(11) NOT NULL,
  `line` int(11) NOT NULL,
  `bottom` int(11) NOT NULL,
  `top` int(11) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `colstart` int(11) NOT NULL,
  `width` int(11) NOT NULL,
  `dummy` int(11) NOT NULL DEFAULT '-1',
  `project` int(11) NOT NULL,
  `linebreakSymbol` varchar(10) NOT NULL DEFAULT '-',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=37656 DEFAULT CHARSET=utf8;

#
# Structure for table "projectlog"
#

DROP TABLE IF EXISTS `projectlog`;
CREATE TABLE `projectlog` (
  `projectID` int(11) NOT NULL,
  `uid` int(11) NOT NULL,
  `content` text CHARACTER SET latin1 NOT NULL,
  `creationDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

#
# Structure for table "projectlogbackup"
#

DROP TABLE IF EXISTS `projectlogbackup`;
CREATE TABLE `projectlogbackup` (
  `projectID` int(11) NOT NULL,
  `uid` int(11) NOT NULL,
  `content` text CHARACTER SET latin1 NOT NULL,
  `creationDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

#
# Structure for table "projectpermissions"
#

DROP TABLE IF EXISTS `projectpermissions`;
CREATE TABLE `projectpermissions` (
  `allow_OAC_read` tinyint(1) DEFAULT NULL,
  `allow_OAC_write` tinyint(1) DEFAULT NULL,
  `allow_export` tinyint(1) DEFAULT NULL,
  `allow_public_copy` tinyint(1) DEFAULT NULL,
  `allow_public_modify` tinyint(1) DEFAULT NULL,
  `allow_public_modify_annotation` tinyint(1) DEFAULT NULL,
  `allow_public_modify_buttons` tinyint(1) DEFAULT NULL,
  `allow_public_modify_line_parsing` tinyint(1) DEFAULT NULL,
  `allow_public_modify_metadata` tinyint(1) DEFAULT NULL,
  `allow_public_modify_notes` tinyint(1) DEFAULT NULL,
  `allow_public_read_transcription` tinyint(1) DEFAULT NULL,
  `projectID` int(11) NOT NULL,
  PRIMARY KEY (`projectID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "projectpriorities"
#

DROP TABLE IF EXISTS `projectpriorities`;
CREATE TABLE `projectpriorities` (
  `uid` int(11) NOT NULL,
  `priority` int(11) NOT NULL,
  `projectID` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

#
# Structure for table "sentences"
#

DROP TABLE IF EXISTS `sentences`;
CREATE TABLE `sentences` (
  `sentence` text NOT NULL,
  `length` int(12) NOT NULL,
  `period` int(12) NOT NULL,
  `question` int(12) NOT NULL,
  `exclaimation` int(12) NOT NULL,
  `comma` int(12) NOT NULL,
  `semicolon` int(12) NOT NULL,
  `colon` int(12) NOT NULL,
  `tract` varchar(512) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "sources"
#

DROP TABLE IF EXISTS `sources`;
CREATE TABLE `sources` (
  `book` varchar(512) NOT NULL,
  `chapter` varchar(512) NOT NULL,
  `verse` varchar(512) NOT NULL,
  `tract` varchar(512) NOT NULL,
  `biblioId` int(11) NOT NULL,
  `pageStart` int(11) NOT NULL,
  `loc` varchar(512) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exclude` int(1) NOT NULL DEFAULT '0',
  `quoteId` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `biblioId` (`biblioId`),
  KEY `book` (`book`(333)),
  KEY `chapter` (`chapter`(333)),
  KEY `verse` (`verse`(333)),
  KEY `tract` (`tract`(333))
) ENGINE=MyISAM AUTO_INCREMENT=23461 DEFAULT CHARSET=utf8;

#
# Structure for table "tagtracking"
#

DROP TABLE IF EXISTS `tagtracking`;
CREATE TABLE `tagtracking` (
  `tag` varchar(256) COLLATE utf8_bin NOT NULL,
  `folio` int(11) NOT NULL,
  `line` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `folio` (`folio`)
) ENGINE=MyISAM AUTO_INCREMENT=96526 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

#
# Structure for table "tasks"
#

DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `project` int(11) NOT NULL,
  `beginFolio` int(11) NOT NULL,
  `endFolio` int(11) NOT NULL,
  `UID` int(11) NOT NULL,
  `title` varchar(512) NOT NULL,
  `id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Structure for table "tools"
#

DROP TABLE IF EXISTS `tools`;
CREATE TABLE `tools` (
  `tool` varchar(512) DEFAULT '',
  `uid` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

#
# Structure for table "transcription"
#

DROP TABLE IF EXISTS `transcription`;
CREATE TABLE `transcription` (
  `folio` int(11) NOT NULL,
  `line` int(11) NOT NULL,
  `comment` text NOT NULL,
  `text` mediumtext NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `creator` int(11) NOT NULL,
  `projectID` int(11) NOT NULL DEFAULT '0',
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `x` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `width` int(11) NOT NULL,
  `height` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `folio` (`folio`),
  KEY `line` (`line`),
  KEY `creator` (`creator`),
  KEY `proj` (`projectID`)
) ENGINE=MyISAM AUTO_INCREMENT=101165051 DEFAULT CHARSET=utf8;

#
# Structure for table "users"
#

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `Uname` varchar(255) CHARACTER SET latin1 NOT NULL,
  `UID` int(11) NOT NULL AUTO_INCREMENT,
  `pass` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `lname` varchar(512) CHARACTER SET latin1 NOT NULL DEFAULT 'new',
  `fname` varchar(512) CHARACTER SET latin1 NOT NULL DEFAULT 'new',
  `openID` text CHARACTER SET latin1 NOT NULL,
  `accepted` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `hasAccepted` int(11) DEFAULT '0',
  `lastActive` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`UID`)
) ENGINE=MyISAM AUTO_INCREMENT=1226 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

#
# Structure for table "usertools"
#

DROP TABLE IF EXISTS `usertools`;
CREATE TABLE `usertools` (
  `projectID` int(11) NOT NULL,
  `url` text NOT NULL,
  `name` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

#
# Structure for table "welcomemessage"
#

DROP TABLE IF EXISTS `welcomemessage`;
CREATE TABLE `welcomemessage` (
  `msg` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

#
# Structure for table "words"
#

DROP TABLE IF EXISTS `words`;
CREATE TABLE `words` (
  `tract` varchar(512) NOT NULL,
  `word` varchar(512) NOT NULL,
  `root` varchar(512) NOT NULL,
  `folio` varchar(512) NOT NULL,
  `line` varchar(512) NOT NULL,
  `paragraph` varchar(512) NOT NULL,
  `sentence` varchar(512) NOT NULL,
  `id` int(12) NOT NULL AUTO_INCREMENT,
  `page` int(12) NOT NULL,
  `length` int(12) NOT NULL,
  `def` text NOT NULL,
  `count` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `word` (`word`(333))
) ENGINE=MyISAM AUTO_INCREMENT=520015 DEFAULT CHARSET=utf8;

#
# Structure for table "xml"
#

DROP TABLE IF EXISTS `xml`;
CREATE TABLE `xml` (
  `work` varchar(512) NOT NULL,
  `text` mediumtext NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
