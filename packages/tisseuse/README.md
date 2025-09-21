# Tricoteuses Tisseuse

_Find links in/to French legislative documents_

_Tricoteuses Tisseuse is free and open source software.

- [software repository](https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/tisseuse)
- [GNU Affero General Public License version 3 or greater](https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/tisseuse/LICENSE.md)

Tricoteuses Tisseuse started from a full rewrite of [Metslesliens](https://www.npmjs.com/package/metslesliens) by Seb35, published under the "DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE" (WTFPL) version 2.

## Installation

### Create database

Using Debian GNU/Linux, install PostgreSQL, then:

```sh
sudo su - postgres
createuser tisseuse -P # and enter the password
createdb -O tisseuse tisseuse
psql tisseuse
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
exit
```

### Install dependencies

```sh
npm install
```

## Server Configuration

Create a `.env` file to set configuration variables (you can use `example.env` as a template). Then:

```sh
npm run configure
```
