import { Router, type Request, type Response } from "express";

const router = Router();

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Suppression de compte — Phytoclinic</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --green: #2d7a3a;
      --green-light: #e8f5eb;
      --red: #c0392b;
      --red-light: #fdecea;
      --text: #1a1a1a;
      --muted: #6b7280;
      --border: #e5e7eb;
      --bg: #f9fafb;
      --white: #ffffff;
      --radius: 12px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 24px 16px 60px;
    }

    .container {
      max-width: 680px;
      margin: 0 auto;
    }

    .logo-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: var(--green);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .logo-name {
      font-size: 22px;
      font-weight: 800;
      color: var(--green);
      letter-spacing: -0.5px;
    }

    .logo-sub {
      font-size: 12px;
      color: var(--muted);
      margin-top: 1px;
    }

    h1 {
      font-size: 26px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--muted);
      font-size: 15px;
      margin-bottom: 32px;
    }

    .lang-toggle {
      display: flex;
      gap: 8px;
      margin-bottom: 28px;
    }

    .lang-btn {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--white);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: var(--muted);
      transition: all 0.15s;
    }

    .lang-btn.active {
      background: var(--green);
      border-color: var(--green);
      color: #fff;
    }

    .card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card-title .icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .icon-green { background: var(--green-light); }
    .icon-red   { background: var(--red-light); }

    .steps {
      list-style: none;
      counter-reset: steps;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .steps li {
      counter-increment: steps;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .steps li::before {
      content: counter(steps);
      min-width: 26px;
      height: 26px;
      background: var(--green);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .steps li p { font-size: 14px; color: var(--text); }
    .steps li strong { font-weight: 600; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th {
      background: var(--green-light);
      color: var(--green);
      font-weight: 700;
      padding: 10px 12px;
      text-align: left;
    }

    td {
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      vertical-align: top;
    }

    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-deleted { background: var(--red-light); color: var(--red); }
    .badge-kept    { background: #fef3c7; color: #92400e; }

    .warning-box {
      background: var(--red-light);
      border: 1px solid #f5c6cb;
      border-radius: var(--radius);
      padding: 16px 20px;
      font-size: 14px;
      color: var(--red);
      margin-bottom: 16px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .contact-box {
      background: var(--green-light);
      border: 1px solid #b7dfbc;
      border-radius: var(--radius);
      padding: 16px 20px;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .contact-box a {
      color: var(--green);
      font-weight: 600;
      text-decoration: none;
    }

    .contact-box a:hover { text-decoration: underline; }

    .footer {
      text-align: center;
      color: var(--muted);
      font-size: 12px;
      margin-top: 40px;
    }

    /* RTL support for Arabic */
    [dir="rtl"] th { text-align: right; }
    [dir="rtl"] .logo-bar { flex-direction: row-reverse; }
    [dir="rtl"] .lang-toggle { flex-direction: row-reverse; }
    [dir="rtl"] .steps li { flex-direction: row-reverse; }
    [dir="rtl"] .card-title { flex-direction: row-reverse; }
    [dir="rtl"] .warning-box { flex-direction: row-reverse; }

    @media (max-width: 480px) {
      h1 { font-size: 22px; }
      .card { padding: 18px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-bar">
      <div class="logo-icon">🌿</div>
      <div>
        <div class="logo-name">Phytoclinic</div>
        <div class="logo-sub" id="logo-sub">Conseils agricoles spécialisés</div>
      </div>
    </div>

    <div class="lang-toggle">
      <button class="lang-btn active" onclick="setLang('fr')" id="btn-fr">Français</button>
      <button class="lang-btn" onclick="setLang('ar')" id="btn-ar">العربية</button>
    </div>

    <!-- FRENCH CONTENT -->
    <div id="content-fr">
      <h1>Suppression de compte et de données</h1>
      <p class="subtitle">Application Phytoclinic — Politique de suppression de compte</p>

      <div class="warning-box">
        <span>⚠️</span>
        <span>La suppression de votre compte est <strong>définitive et irréversible</strong>. Toutes vos données seront effacées conformément à la procédure décrite ci-dessous.</span>
      </div>

      <div class="card">
        <div class="card-title">
          <div class="icon icon-green">📋</div>
          Procédure de demande de suppression
        </div>
        <ol class="steps">
          <li><p>Ouvrez l'application <strong>Phytoclinic</strong> sur votre appareil et connectez-vous à votre compte.</p></li>
          <li><p>Accédez à l'onglet <strong>Profil</strong> (icône en bas à droite de l'écran).</p></li>
          <li><p>Faites défiler jusqu'en bas et appuyez sur <strong>« Demander la suppression de mon compte et mes données »</strong>.</p></li>
          <li><p>Confirmez votre demande dans la boîte de dialogue qui s'affiche. Votre client email s'ouvrira automatiquement avec un message pré-rempli adressé à notre équipe.</p></li>
          <li><p><strong>Alternativement</strong>, vous pouvez envoyer directement un email à <a href="mailto:phytoclinicsv@gmail.com" style="color:#2d7a3a;font-weight:600;">phytoclinicsv@gmail.com</a> en indiquant votre nom, numéro de téléphone enregistré et la demande de suppression.</p></li>
        </ol>
      </div>

      <div class="card">
        <div class="card-title">
          <div class="icon icon-red">🗑️</div>
          Données supprimées et données conservées
        </div>
        <table>
          <thead>
            <tr>
              <th>Type de données</th>
              <th>Action</th>
              <th>Délai</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Compte utilisateur (nom, téléphone, mot de passe)</td>
              <td><span class="badge badge-deleted">Supprimé</span></td>
              <td>Dans les 30 jours</td>
            </tr>
            <tr>
              <td>Consultations et échanges de messages</td>
              <td><span class="badge badge-deleted">Supprimé</span></td>
              <td>Dans les 30 jours</td>
            </tr>
            <tr>
              <td>Photos et médias partagés</td>
              <td><span class="badge badge-deleted">Supprimé</span></td>
              <td>Dans les 30 jours</td>
            </tr>
            <tr>
              <td>Token de notification push</td>
              <td><span class="badge badge-deleted">Supprimé</span></td>
              <td>Immédiat</td>
            </tr>
            <tr>
              <td>Journaux d'activité anonymisés (à des fins de sécurité)</td>
              <td><span class="badge badge-kept">Conservé 90 jours</span></td>
              <td>90 jours max</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="contact-box">
        📧 Pour toute question concernant la suppression de votre compte, contactez-nous à :<br />
        <a href="mailto:phytoclinicsv@gmail.com">phytoclinicsv@gmail.com</a><br />
        <span style="color:#6b7280;font-size:13px;margin-top:4px;display:block;">Nous répondrons à votre demande dans un délai de <strong>30 jours</strong>.</span>
      </div>
    </div>

    <!-- ARABIC CONTENT -->
    <div id="content-ar" dir="rtl" style="display:none; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
      <h1>حذف الحساب والبيانات</h1>
      <p class="subtitle">تطبيق Phytoclinic — سياسة حذف الحساب</p>

      <div class="warning-box">
        <span>⚠️</span>
        <span>حذف حسابك <strong>نهائي ولا يمكن التراجع عنه</strong>. سيتم مسح جميع بياناتك وفقاً للإجراء الموضح أدناه.</span>
      </div>

      <div class="card">
        <div class="card-title">
          <div class="icon icon-green">📋</div>
          إجراء طلب الحذف
        </div>
        <ol class="steps">
          <li><p>افتح تطبيق <strong>Phytoclinic</strong> على جهازك وسجّل الدخول إلى حسابك.</p></li>
          <li><p>انتقل إلى تبويب <strong>الملف الشخصي</strong> (الأيقونة في أسفل الشاشة).</p></li>
          <li><p>مرّر للأسفل واضغط على <strong>« طلب حذف حسابي وبياناتي »</strong>.</p></li>
          <li><p>أكّد طلبك في مربع الحوار الذي يظهر. سيتم فتح تطبيق البريد الإلكتروني تلقائياً برسالة جاهزة موجّهة إلى فريقنا.</p></li>
          <li><p><strong>بديلاً عن ذلك</strong>، يمكنك إرسال بريد إلكتروني مباشرةً إلى <a href="mailto:phytoclinicsv@gmail.com" style="color:#2d7a3a;font-weight:600;">phytoclinicsv@gmail.com</a> مع ذكر اسمك ورقم هاتفك المسجّل وطلب الحذف.</p></li>
        </ol>
      </div>

      <div class="card">
        <div class="card-title">
          <div class="icon icon-red">🗑️</div>
          البيانات المحذوفة والبيانات المحتفظ بها
        </div>
        <table>
          <thead>
            <tr>
              <th>نوع البيانات</th>
              <th>الإجراء</th>
              <th>المدة الزمنية</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>الحساب (الاسم، الهاتف، كلمة المرور)</td>
              <td><span class="badge badge-deleted">محذوف</span></td>
              <td>خلال 30 يوماً</td>
            </tr>
            <tr>
              <td>الاستشارات وسجل الرسائل</td>
              <td><span class="badge badge-deleted">محذوف</span></td>
              <td>خلال 30 يوماً</td>
            </tr>
            <tr>
              <td>الصور والوسائط المشتركة</td>
              <td><span class="badge badge-deleted">محذوف</span></td>
              <td>خلال 30 يوماً</td>
            </tr>
            <tr>
              <td>رمز الإشعارات الفورية</td>
              <td><span class="badge badge-deleted">محذوف</span></td>
              <td>فوري</td>
            </tr>
            <tr>
              <td>سجلات النشاط مجهولة الهوية (لأغراض أمنية)</td>
              <td><span class="badge badge-kept">محتفظ به 90 يوماً</span></td>
              <td>90 يوماً كحد أقصى</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="contact-box" dir="rtl">
        📧 لأي استفسار بشأن حذف حسابك، تواصل معنا على:<br />
        <a href="mailto:phytoclinicsv@gmail.com">phytoclinicsv@gmail.com</a><br />
        <span style="color:#6b7280;font-size:13px;margin-top:4px;display:block;">سنردّ على طلبك في غضون <strong>30 يوماً</strong>.</span>
      </div>
    </div>

    <div class="footer">
      <span id="footer-text">© 2025 Phytoclinic · Tous droits réservés</span>
    </div>
  </div>

  <script>
    function setLang(lang) {
      document.getElementById('content-fr').style.display = lang === 'fr' ? 'block' : 'none';
      document.getElementById('content-ar').style.display = lang === 'ar' ? 'block' : 'none';
      document.getElementById('btn-fr').classList.toggle('active', lang === 'fr');
      document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
      document.getElementById('logo-sub').textContent = lang === 'fr'
        ? 'Conseils agricoles spécialisés'
        : 'استشارات زراعية متخصصة';
      document.getElementById('footer-text').textContent = lang === 'ar'
        ? '© 2025 Phytoclinic · جميع الحقوق محفوظة'
        : '© 2025 Phytoclinic · Tous droits réservés';
      document.documentElement.lang = lang;
      document.title = lang === 'ar'
        ? 'حذف الحساب — Phytoclinic'
        : 'Suppression de compte — Phytoclinic';
    }
  </script>
</body>
</html>`;

router.get("/delete-account", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(html);
});

export default router;
