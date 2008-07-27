require 'test/unit'
require 'googtmpl'

include GoogTemplate

class TC_GoogTmpl < Test::Unit::TestCase
  def assert_render(exp, tmpl, data={})
    tmpl = Template.new.parse(tmpl)
    out = ''
    tmpl.render(out, data)
    assert_equal(exp, out)
  end

  def test_plaintext
    text = "foo bar baz"
    assert_render(text, text)
  end

  def test_plain_curlies
    text = "foo { baz }"
    assert_render(text, text)
    text = "foo {"
    assert_render(text, text)
    text = "{"
    assert_render(text, text)
    text = "{}"
    assert_render(text, text)
  end

  def test_simple_special
    text = "foo {{BAR}} baz"
    assert_render(text, text, {:bar => '{{BAR}}'})
    assert_render("foo  baz", text, {:bar => ''})
    assert_render("foo  baz", text, {})
  end

  def test_boolean
    text = "foo {{#COND}}bar{{/COND}}"
    assert_render("foo bar", text, {:cond => true})
    assert_render("foo ", text, {:cond => false})
  end

  def test_nested
    text = "a {{#BAR}}b{{/BAR}} c"
    assert_render("a  c", text, {})
    assert_render("a b c", text, {:bar => ''})
    assert_render("a bb c", text, {:bar => [{},{}]})
  end

  def test_nested_vars
    text = "a {{#BAR}}b{{D}} {{/BAR}}c"
    assert_render("a c", text, {})
    assert_render("a b c", text, {:bar => {}})
    assert_render("a bx by c", text, {:bar => [{:d => 'x'},{:d => 'y'}]})
  end

  def test_multi_stack
    text = "a {{#B}}b{{#C}}c{{/C}} {{/B}} d {{#E}}e{{/E}}"
    assert_render("a  d ", text, {})
    assert_render("a bc  d ", text, {:b => {:c => ''}})
    assert_render("a b  d e", text, {:b => {}, :e => ''})
  end

  def test_multiline
    tmpl = Template.new.parse("foo\nbar \nbaz", true)
    out = ''
    tmpl.render(out, {})
    assert_equal("foobarbaz", out)
  end

  def test_forcedspace_nostrip
    tmpl = Template.new.parse("foo{{ }}\nbar", false)
    out = ''
    tmpl.render(out, {})
    assert_equal("foo \nbar", out)
  end

  def test_forcedspace_strip
    tmpl = Template.new.parse("foo{{ }}\nbar", true)
    out = ''
    tmpl.render(out, {})
    assert_equal("foo bar", out)
  end
end

class TC_HTML < Test::Unit::TestCase
  def assert_render(exp, tmpl, data={})
    tmpl = HTMLTemplate.new.parse(tmpl)
    out = ''
    tmpl.render(out, data)
    assert_equal(exp, out)
  end

  def test_html
    tmpl = "{{FOO}} {{FOO:h}} {{FOO:r}}"
    assert_render("&lt;a&gt; &lt;a&gt; <a>", tmpl, {:foo => '<a>'})
  end
end

