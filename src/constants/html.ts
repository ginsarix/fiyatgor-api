export const catalogNotFoundPageHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Katalog Bulunamadı</title>
    <style>
        :root {
            --bg-color: #151515;
            --text-color: #eeeeee;
            --accent-color: #ffffff;
            --secondary-text: #888888;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            text-align: center;
            padding: 1rem;
        }

        .error-code {
            font-size: 120px;
            font-weight: 900;
            margin: 0;
            line-height: 1;
            letter-spacing: -2px;
            color: var(--accent-color);
        }

        h1 {
            font-size: 24px;
            font-weight: 400;
            margin: 20px 0 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        p {
            font-size: 16px;
            color: var(--secondary-text);
            max-width: 400px;
            margin: 0 auto 40px;
            line-height: 1.5;
        }

        .btn {
            display: inline-block;
            padding: 15px 30px;
            border: 1px solid var(--accent-color);
            color: var(--accent-color);
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.2s ease;
        }

        .btn:hover {
            background-color: var(--accent-color);
            color: var(--bg-color);
        }

        .divider {
            width: 40px;
            height: 2px;
            background-color: var(--accent-color);
            margin: 20px auto;
        }
    </style>
</head>
<body>

    <div class="container">
        <div class="error-code">404</div>
        <div class="divider"></div>
        <h1>Katalog Bulunamadı</h1>
        <p>
            İstenen katalog sunucu kayıtlarında mevcut değil. <br>
            Katalog henüz eklenilmedi ya da hatalı bağlantı girildi.
        </p>
        <a href="https://admin.fiyatgor.panunet.com.tr/" class="btn">Ana Sayfaya Dön</a>
    </div>

</body>
</html>`;
