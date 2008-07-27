#!/usr/bin/ruby
# Simple templating library
# Copyright (C) 2007 Evan Martin <martine@danga.com>

require 'cgi'
require 'strscan'

# This is not an official Google module; it just provides an API similar
# to the Google-released (C++) template library.
#
# It is intentionally very simple: the data provided to the template is
# a just a tree of values.  If you're looking for a mixture of code and
# template try erb.
module GoogTemplate

class ParseError < RuntimeError; end

# Templates are plain text interspersed with markup tags.
#
# Basic tags are written with double-curlies: {{FOO}} means the tag "FOO".
# A template is rendered by passing in a hash, which maps symbols like :foo to
# values.
#   E.g. Template.new.parse('a {{B}} c').render(stdout, {:b=>'x'})
#        => prints 'a x c'.
#
# Sub-blocks are wrapped with {{#FOO}} and {{/FOO}} and can be nested.
# A sub-block expects as its data one of:
#   - a hash (for data contained within the block)
#   - an array of hashes (which repeats the block once for each hash)
#   - a boolean, where true is the same as {} and false skips the sub-block.
#
# If a value isn't provided for any key, the tag is skipped.
# 
# Sub-blocks can be used to produce both "if" and "foreach".
# - Conditional sections:
#   Template: "a {{#MAYBE}}b{{/MAYBE}} c"
#   Data: { :maybe => {} }  produces  "a b c"
#   Data: { }  produces  "a  c".
# - Conditionals with a boolean:
#   Template: "a {{#MAYBE}}b{{/MAYBE}} c"
#   Data: { :maybe => true }  produces  "a b c"
#   Data: { :maybe => false }  produces  "a  c".
#
# - Foreach loops:
#   Template: "Weekdays: {{#DAYS}}{{DAY}} {{/DAYS}}"
#   Data: { :days => [{:day=>'Mon'},{:day=>'Tue'}] }
#   Produces: "Weekdays: Mon Tue "
#
# Basic tags can pass their data through a series of filters.
# Add a filter to the template:
#   template.add_filter('stars', proc {|x| "**#{x}**"})
# And then filter a tag through it by separating with a colon:
#   Template: "{{A}} {{A:stars}}"
#   Data: { :a => 'a' }
#   Produces: "a **a**"
# Multiple filters can be used in sequence: {{X:foo:bar}}.
class Template
  class StringBlock
    def initialize(str); @str = str; end
    def render(out, data); out << @str; end
  end

  class DataBlock
    def initialize(tag, filters); @tag = tag; @filters = filters; end
    def render(out, data)
      return unless data.has_key? @tag
      value = @filters.inject(data[@tag].to_s) { |v, f| f.call(v) }
      out << value
    end
  end

  class NestedBlock
    attr_reader :tag
    def initialize(tag); @tag = tag; @blocks = []; end
    def render(out, data, root=false)
      unless root
        return unless data.has_key? @tag
        data = data[@tag]
      end
      if data.kind_of? Array
        data.each { |d| render(out, d, true) }
      elsif data
        data = {} if data == true
        @blocks.each { |block| block.render(out, data) }
      end
    end
    def <<(block)
      @blocks << block
    end
  end

  def initialize
    @filters = {}
    @defaultfilters = []
  end

  def load(filename, strip_blanks=false)
    parse(open(filename).read, strip_blanks)
  end

  # Output (via <<) the rendering of data to out.
  def render(out, data)
    @root.render(out, data, true)
  end

  # Parse template text, filling in @root with the template tree.
  def parse(text, strip_blanks=false)
    @root = NestedBlock.new('ROOT')
    stack = [@root]
    scan(text) do |special, block|
      if special
        case block
        when /^#(.*)$/
          sub = NestedBlock.new(text_to_key($1))
          stack.last << sub
          stack.push(sub)
        when /^\/(.*)$/
          unless stack.last.tag == text_to_key($1)
            raise ParseError, "expected close for #{stack.last.tag.inspect}, got #{$1.inspect}"
          end
          stack.pop
        when ' '
          # we hardcode {{ }} to be a space.
          stack.last << StringBlock.new(' ')
        else  # a plain "data" block
          parts = block.split(/:/)
          block = parts.shift
          filters = parts.map do |f|
            unless @filters.has_key? f
              raise ParseError, "Unknown filter #{f.inspect} in #{block.inspect}"
            end
            @filters[f]
          end
          filters = @defaultfilters if filters.empty?
          stack.last << DataBlock.new(text_to_key(block), filters)
        end
      else
        block.gsub!(/\s*\n\s*/, '') if strip_blanks
        stack.last << StringBlock.new(block) unless block.empty?
      end
    end
    if stack.size > 1
      raise ParseError, "unclosed tag #{stack.last.tag}"
    end
    self
  end

  # Scan a template string, yielding:
  #   (true, "FOO")  for text like {{FOO}}
  #   (false, "...") for all other text
  # Used internally by parse().
  def scan(tmpl)
    scanner = StringScanner.new(tmpl)
    text = ''
    while not scanner.eos?
      text << scanner.scan(/[^{]*/)
      if scanner.scan(/\{\{/)
        special = scanner.scan(/[^}]+/)
        unless scanner.scan(/\}\}/)
          raise ParseError, "expected }} at offset #{scanner.pos}"
        end

        yield false, text
        yield true, special
        text = ''
      else
        char = scanner.getch   # eat the { 
        text << char if char
      end
    end
    yield false, text unless text.empty?

    self
  end

  def add_filter(key, filter)
    @filters[key] = filter
  end

  private
  def text_to_key(text)
    text.downcase.to_sym
  end
end

# An HTMLTemplate has a filter for HTML-escaping, called "h",
# which is applied by default to avoid XSS problems.
# {{DATA:h}} and {{DATA}} output HTML-escaped text, while
# {{DATA:r}} outputs raw text (to avoid using the default filter).
class HTMLTemplate < Template
  def initialize(filename=nil, strip_blanks=false)
    super()
    add_filter('h', proc {|x| CGI::escapeHTML(x) })
    @defaultfilters = [@filters['h']]
    add_filter('r', proc {|x| x })
    load(filename, strip_blanks) if filename
  end
end

end  # module GoogTemplate
