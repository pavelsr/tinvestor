# Running

1. Install cpm

```
sudo curl -fsSL --compressed https://git.io/cpm > /usr/local/bin/cpm && \
    sudo chmod +x /usr/local/bin/cpm
```

2. Install Perl modules

```
sudo cpm install -gv
```

3. Run Selenoid

```
docker-compose up -d
```

4. Run parser

```
perl parse.pl <your_tinkoff_login>  <your_tinkoff_pass>
```

Script will auto open Selenoid UI where you can view parse progress.

If you occasionally closed UI you can manually find it at http://localhost:8080/

5. View results

```
python -m SimpleHTTPServer
```

Then go to http://localhost:8000/

Or just `xdg-open index.html`
