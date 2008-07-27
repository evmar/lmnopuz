#!/usr/bin/ruby
#--
# Across Lite's crossword file format (.puz) decoder.
# Copyright (C) 2007 Evan Martin <martine@danga.com>
#
# Permission is hereby granted, free of charge, to any person obtaining
# a copy of this software and associated documentation files (the
# "Software"), to deal in the Software without restriction, including
# without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so, subject to
# the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
# IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
# CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
# TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#++
#
# See Crossword for details.

# A crossword.
class Crossword
  # Title of the crossword (ISO-8859-1).
  attr_accessor :title
  # Author of the crossword (ISO-8859-1).
  attr_accessor :author
  # Copyright statement of the crossword (ISO-8859-1).
  attr_accessor :copyright
  # Width of the crossword in cells.
  attr_accessor :width
  # Height of the crossword in cells.
  attr_accessor :height

  # A hash mapping number to clue.
  # E.g., down[3] is the clue for "3 Down".
  attr_accessor :down
  # A hash mapping number to clue.
  # E.g., across[3] is the clue for "3 Across".
  attr_accessor :across
  # A 2d array of Square.
  # squares[0][0] is the top-left, squares[@width-1][@height-1] the
  # bottom-right.  An entry is nil if there is no square (a blank) there.
  attr_accessor :squares

  # This exception is raised if there was a problem parsing the file.
  class FailedParseException < Exception; end

  class Square
    # The letter that is the correct answer for this square.
    attr_accessor :answer
    # If this square is the beginning of a down or across clue,
    # then down or across (respectively) hold the clue number, nil otherwise.
    attr_accessor :down, :across

    # If the square is the beginning of either a down or across clue,
    # return that number.  This is the number that should be displayed in the
    # cell if it's being rendered like a normal crossword.
    def number
      @down or @across
    end
  end

  WIDTHOFFSET = 0x2c   # :nodoc:
  HEADERLENGTH = 0x34  # :nodoc:

  # Parse a .puz file.
  def parse(file, do_checksum=false)
    data = file.read
    # we expect the header to contain "ACROSS&DOWN" at offset 2,
    # but some files begin with a filename followed by a newline.
    if data[2,12] != "ACROSS&DOWN\0"
      nl = data.index("\n")
      raise FailedParseException unless nl
      data = data[nl+1..-1]
    end

    checksum = data[0,2].unpack('v')[0]
    @width, @height, cluecount = data[WIDTHOFFSET, 3].unpack('C3')

    # XXX figure out what the rest of the header is.

    ofs = HEADERLENGTH
    @key = key = data[ofs, @width*@height]
    ofs += key.length
    dashes = data[ofs, @width*@height]  # unused... ?
    ofs += dashes.length

    # sometimes the comment contains nuls.
    # so we limit the split to clues + 3 headers + optional comment.
    strings = data[ofs..-1].split(/\0/, cluecount+3+1)

    if do_checksum
      file_csum = compute_checksum(data, ofs, strings[0...(cluecount+3)])
      unless file_csum == checksum
        raise FailedParseException, "bad checksum"
      end
    end

    # XXX right here we should convert the strings to UTF-8.
    
    clueoffset = ofs
    @title = strings.shift
    clueoffset += @title.length + 1
    @author = strings.shift
    clueoffset += @author.length + 1
    @copyright = strings.shift
    clueoffset += @copyright.length + 1

    if strings.length > cluecount
      @comment = strings.pop
      @comment.gsub!(/\0$/, '') # the last has a trailing nul, too
    end

    # use the answer key to construct the square array,
    # then figure the rest once we have the complete picture.
    @squares = Array.new(@width) do |x|
      Array.new(@height) do |y|
        char = key[y*@width + x,1]
        unless char == '.'
          square = Square.new
          square.answer = char
          square
        end
      end
    end
    assign_numbers!
    assign_clues! strings

    self
  end

  # Return a hash of the answer key for the crossword.
  # Useful for identifying duplicate crosswords.
  # (XXX: ought to use sha-1 here.)
  def key_hash
    @key.hash
  end

  private
  # Checksum processing is all due to Josh Myer <josh@joshisanerd.com>.
  def compute_checksum(data, stringsoffset, strings)
    def merge(str, sum)
      str.each_byte do |byte|
        if sum & 1 != 0
          sum >>= 1
          sum += 0x8000 
        else
          sum >>= 1
        end
        sum += byte
        sum &= 0xFFFF
      end
      sum
    end
    clueoffset = stringsoffset
    strings[0,3].each { |str| clueoffset += str.length + 1 }
    sum = merge(data[WIDTHOFFSET...clueoffset], 0)
    sum = strings[3..-1].inject(sum) { |accum, str| merge(str, accum) }
    sum
  end

  def each_square
    0.upto(@height-1) do |y|
      0.upto(@width-1) do |x|
        yield x, y, @squares[x][y] if @squares[x][y]
      end
    end
  end

  private
  def assign_numbers!
    num = 1
    each_square do |x, y, square|
      # we're a numbered square if we're on an min extreme
      # and we have at least one square following...
      if (x == 0 or @squares[x-1][y].nil?) and
         (x+1 < @width and @squares[x+1][y])
        across = true
      end
      if (y == 0 or @squares[x][y-1].nil?) and
         (y+1 < @height and @squares[x][y+1])
        down = true
      end

      if down or across
        square.down   = num if down
        square.across = num if across
        num += 1
      end
    end
  end

  # Shift a clue off of the clue stack and fail if we didn't have one.
  # Only used by assign_clues!.
  def shift_clue(clues)
    clue = clues.shift
    raise FailedParseException, "missing clue" unless clue
    clue
  end

  def assign_clues! clues
    @down = {}
    @across = {}

    each_square do |x, y, square|
      @across[square.across] = shift_clue(clues) if square.across
      @down[square.down]     = shift_clue(clues) if square.down
    end
  end

  public
  # Dump the clues in a nice format.
  def show_clues
    puts "ACROSS"
    @across.keys.sort.each do |i|
      clue = @across[i]
      puts "#{i}: #{clue}" if clue
    end
    puts
    puts "DOWN"
    @down.keys.sort.each do |i|
      clue = @down[i]
      puts "#{i}: #{clue}" if clue
    end
  end

  # Dump the solution in a nice format.
  def show_solution
    0.upto(@height-1) do |y|
      0.upto(@width-1) do |x|
        print((@squares[x][y] ? @squares[x][y].answer : ' ') + ' ')
      end
      puts
    end
  end

  # Dump the square numbers in the crossword's layout.
  def show_numbers
    # use three chars per cell to hopefully fit numbers > 99.
    0.upto(@height-1) do |y|
      0.upto(@width-1) do |x|
        if @squares[x][y]
          if @squares[x][y].number
            print '%3d' % @squares[x][y].number
          else
            print '  .'
          end
        else
          print '   '
        end
      end
      puts
    end
  end
end

# vim: set ts=2 sw=2 et :
