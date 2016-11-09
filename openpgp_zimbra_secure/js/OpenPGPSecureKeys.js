/*
 * ***** BEGIN LICENSE BLOCK *****
 * OpenPGP Zimbra Secure is the open source digital signature and encrypt for Zimbra Collaboration Open Source Edition software
 * Copyright (C) 2016-present OpenPGP Zimbra Secure

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>
 * ***** END LICENSE BLOCK *****
 *
 * OpenPGP MIME Secure Email Zimlet
 *
 * Written by nguyennv1981@gmail.com
 */

OpenPGPSecureKeys = function(handler) {
    this._handler = handler;
    this._securePwd = '';
    this._fingerprints = [];
    this._userName = this._handler.getUsername();

    this.passphrase = '';
    this.privateKey = false;
    this.publicKey = false;
    this.publicKeys = [];
};

OpenPGPSecureKeys.prototype = new Object();
OpenPGPSecureKeys.prototype.constructor = OpenPGPSecureKeys;

OpenPGPSecureKeys.prototype.init = function(securePwd) {
    var self = this;
    this._securePwd = securePwd;
    var pgpKey = openpgp.key;

    var sequence = Promise.resolve();
    return sequence.then(function() {
        var publicKeys = [];
        if (localStorage['openpgp_public_keys_' + self._userName]) {
            publicKeys = JSON.parse(localStorage['openpgp_public_keys_' + self._userName]);
        }

        publicKeys.forEach(function(armoredKey) {
            var pubKey = pgpKey.readArmored(armoredKey);
            pubKey.keys.forEach(function(key) {
                var fingerprint = key.primaryKey.fingerprint;
                if (!self._fingerprints[fingerprint]) {
                    self.publicKeys.push(key);
                    self._fingerprints[fingerprint] = fingerprint;
                }
            });
        });

        if (localStorage['openpgp_public_key_' + self._userName]) {
            var publicKey = localStorage['openpgp_public_key_' + self._userName];
            self.setPublicKey(publicKey);
        }
        return self;
    })
    .then(function() {
        return OpenPGPUtils.localStorageRead(
            'openpgp_passphrase_' + self._userName,
            self._securePwd
        )
        .then(function(passphrase) {
            return passphrase;
        });
    })
    .then(function(passphrase) {
        return OpenPGPUtils.localStorageRead(
            'openpgp_private_key_' + self._userName,
            self._securePwd
        )
        .then(function(privateKey) {
            var privKey = pgpKey.readArmored(privateKey);
            privKey.keys.forEach(function(key) {
                if (key.decrypt(passphrase)) {
                    self.privateKey = key;
                    self.passphrase = passphrase;
                }
                else {
                    throw new Error(OpenPGPUtils.prop('decryptPrivateKeyError'));
                }
            });
            return privateKey;
        });
    });
};

OpenPGPSecureKeys.prototype.addPublicKey = function(key) {
    var self = this;
    var added = false;

    var fingerprint = key.primaryKey.fingerprint;
    if (!self._fingerprints[fingerprint]) {
        self._fingerprints[fingerprint] = fingerprint;
        self.publicKeys.push(key);
        added = true;
    }

    if (added) {
        this._storePublicKeys();
    }
};

OpenPGPSecureKeys.prototype.removePublicKey = function(fingerprint) {
    var self = this;
    var removed = false;
    this.publicKeys.forEach(function(key) {
        if (fingerprint == key.primaryKey.fingerprint) {
            self.publicKeys.splice(index, 1);
            delete self._fingerprints[fingerprint];
            removed = true;
        }
    });

    if (removed) {
        this._storePublicKeys();
    }
};

OpenPGPSecureKeys.prototype.getPassphrase = function() {
    return this.passphrase;
};

OpenPGPSecureKeys.prototype.getPrivateKey = function() {
    return this.privateKey;
};

OpenPGPSecureKeys.prototype.setPrivateKey = function(privateKey, passphrase) {
    var self = this;
    var privKey = openpgp.key.readArmored(privateKey);
    privKey.keys.forEach(function(key) {
        if (key.decrypt(passphrase)) {
            self.privateKey = key;
            self.passphrase = passphrase;

            OpenPGPUtils.localStorageSave(
                'openpgp_private_key_' + self._userName,
                self._securePwd,
                privateKey
            );
            OpenPGPUtils.localStorageSave(
                'openpgp_passphrase_' + self._userName,
                self._securePwd,
                passphrase
            );
        }
        else {
            throw new Error(OpenPGPUtils.prop('decryptPrivateKeyError'));
        }
    });
};

OpenPGPSecureKeys.prototype.getPublicKeys = function() {
    return this.publicKeys;
};

OpenPGPSecureKeys.prototype.getPublicKey = function() {
    return this.publicKey;
};

OpenPGPSecureKeys.prototype.setPublicKey = function(publicKey) {
    var self = this;
    var pubKey = openpgp.key.readArmored(publicKey);
    pubKey.keys.forEach(function(key) {
        self.publicKey = key;
        localStorage['openpgp_public_key_' + self._userName] = self.publicKey.armor();
        self.addPublicKey(self.publicKey);
    });
};

OpenPGPSecureKeys.prototype.filterPublicKeys = function(receivers) {
    var dupes = [];
    var publicKeys = [];
    this.publicKeys.forEach(function(key) {
        receivers.forEach(function(receiver) {
            for (i = 0; i < key.users.length; i++) {
                var uid = key.users[i].userId.userid;
                var fingerprint = key.primaryKey.fingerprint;
                if (uid.indexOf(receiver) >= 0 && !dupes[fingerprint + uid]) {
                    publicKeys.push(armoredKey);
                    dupes[fingerprint + uid] = fingerprint + uid;
                }
            }
        });
    });
    return publicKeys;
};

OpenPGPSecureKeys.prototype._storePublicKeys = function() {
    var publicKeys = [];
    this.publicKeys.forEach(function(key) {
        publicKeys.push(key.armor());
    });
    var storeKey = 'openpgp_public_keys_' + this._userName;
    localStorage[storeKey] = JSON.stringify(publicKeys);
};
